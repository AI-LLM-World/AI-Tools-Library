"""Minimal CLI for gstack_test_ai: preview, apply, and revert generations.

This CLI intentionally keeps behavior small and auditable:
- Default provider: LocalMockProvider (no external calls)
- Dry-run (preview) is the default; --apply writes files under .gstack_gen/tests/<generation-id>/
- Metadata stored in .gstack_gen/metadata.json as a list of generation entries
- Revert removes the generation directory and metadata entry

The module exposes functions so tests can import and call them directly.
"""
from __future__ import annotations

import argparse
import ast
import sys
import time
import json
import os
import re
import shutil
import tempfile
import uuid
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .core import generate_tests, GenerationResult
from .providers import LocalMockProvider
from .redact import redact_text


METADATA_FILE = ".gstack_gen/metadata.json"


def _sanitize_test_name(name: str, index: Optional[int] = None) -> str:
    # make a safe filename base from test name; append index to avoid collisions
    # Use a non-test prefix so pytest/other test runners don't automatically
    # discover and execute generated files by default (trust boundary).
    base = re.sub(r"[^0-9a-zA-Z_]+", "_", name).strip("_")
    if not base:
        base = "generated"
    # prefix with 'gstack_generated' to avoid starting the filename with
    # 'test_' which would be discovered by pytest
    if index is None:
        return f"gstack_generated_{base}.py"
    return f"gstack_generated_{base}_{index}.py"


def _validate_code(code: str) -> Tuple[bool, Optional[str]]:
    # Delegate to the parser module validation so both CLI and parser share
    # the same conservative AST-based rules. This keeps the trust boundary
    # behavior in a single place and avoids duplicated logic drift.
    from .parser import _validate_code as _parser_validate

    return _parser_validate(code)


def _load_metadata(metadata_path: Path) -> List[Dict]:
    if not metadata_path.exists():
        return []
    try:
        with metadata_path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        # Backup the corrupt file so operators can inspect it instead of
        # silently discarding history. Then surface an error so callers
        # fail-fast and do not overwrite existing metadata.
        backup = metadata_path.with_name(metadata_path.name + f".corrupt.{int(time.time())}")
        try:
            metadata_path.replace(backup)
        except Exception:
            # best-effort backup; ignore failures to avoid hiding the root error
            pass
        raise RuntimeError(f"metadata file corrupted; moved to {backup}")


def _write_metadata_atomic(metadata_path: Path, entries: List[Dict]):
    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    # Use a unique temporary filename in the same directory to avoid
    # collisions when multiple processes attempt to write concurrently.
    unique = f".tmp.{os.getpid()}.{uuid.uuid4().hex}"
    tmp = metadata_path.with_name(metadata_path.name + unique)
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2, sort_keys=True)
        f.flush()
        try:
            os.fsync(f.fileno())
        except Exception:
            # best-effort flush; don't fail write on platforms that don't support fsync
            pass
    # atomically move into place
    os.replace(str(tmp), str(metadata_path))
    # Attempt to fsync the parent directory to make the rename durable.
    # Platforms differ in support; this is a best-effort durability improvement.
    try:
        dir_fd = os.open(str(metadata_path.parent), os.O_RDONLY)
        try:
            os.fsync(dir_fd)
        finally:
            os.close(dir_fd)
    except Exception:
        try:
            # Fall back to O_DIRECTORY where available
            dir_fd = os.open(str(metadata_path.parent), getattr(os, "O_DIRECTORY", 0))
            try:
                os.fsync(dir_fd)
            finally:
                os.close(dir_fd)
        except Exception:
            # give up; durability is best-effort
            pass


def preview_generation(repo_path: str = ".", max_tests: int = 5, strategy: str = "coverage", provider_name: str = "localmock", allow_external: bool = False) -> Tuple[GenerationResult, str]:
    """Run the generator and return a human-readable preview string (no writes)."""
    provider = None
    if provider_name and provider_name.lower() in ("localmock", "local_mock"):
        provider = LocalMockProvider()
    else:
        # External providers not implemented in MVP; block by default
        if not allow_external:
            raise RuntimeError("external provider usage disabled; set allow_external=True to enable")
        raise RuntimeError("requested provider not available in this MVP: %s" % provider_name)

    result = generate_tests(repo_path=repo_path, max_tests=max_tests, strategy=strategy, provider=provider, dry_run=True, allow_external=allow_external)

    lines: List[str] = []
    lines.append(f"Preview: {len(result.tests)} candidate tests (max={max_tests})")
    if result.parse_errors:
        lines.append("Parse/Provider errors:")
        for e in result.parse_errors:
            lines.append("  - " + e)

    gen_hint = "<will be written under .gstack_gen/tests/<generation-id>/...>"
    for i, t in enumerate(result.tests):
        fname = _sanitize_test_name(t.name, i)
        lines.append("---")
        lines.append(f"[{i}] file: {fname}  ({gen_hint})")
        snippet = t.code.strip().splitlines()
        # show a short snippet
        for ln in snippet[:20]:
            lines.append("    " + ln)
        if len(snippet) > 20:
            lines.append("    # ... truncated ...")

    return result, "\n".join(lines)


def apply_generation(result: GenerationResult, repo_path: str = ".", provider_name: str = "localmock", allow_external: bool = False) -> Dict:
    """Apply a generation result: write validated tests and append metadata. Returns the metadata entry."""
    # Prevent applying results from external providers unless explicitly allowed
    if provider_name and provider_name.lower() not in ("localmock", "local_mock") and not allow_external:
        raise RuntimeError("external provider usage disabled; set allow_external=True to enable")

    base = Path(repo_path) / ".gstack_gen"
    gen_id = str(uuid.uuid4())
    ts = datetime.now(timezone.utc).isoformat()
    # Write into a temporary directory first to avoid races
    tmp_out_dir = base / "tests" / f".tmp.{gen_id}"
    tmp_out_dir.mkdir(parents=True, exist_ok=False)

    tests_meta = []
    applied = 0
    for idx, t in enumerate(result.tests):
        status = "validated"
        reason = None
        ok, reason = _validate_code(t.code)
        if not ok:
            status = "parse_error"
        fname = _sanitize_test_name(t.name, idx)
        fpath = tmp_out_dir / fname
        if status == "validated":
            with fpath.open("w", encoding="utf-8") as f:
                f.write(t.code)
            applied += 1

        tests_meta.append({"file": str(Path("tests") / gen_id / fname), "status": status})

    # collect redactions from individual tests (best-effort)
    all_redactions: List[Dict[str, str]] = []
    for t in result.tests:
        try:
            _, reds = redact_text(t.code)
            all_redactions.extend(reds)
        except Exception:
            # don't fail apply for redaction errors
            pass

    meta_entry = {
        "generation_id": gen_id,
        "timestamp": ts,
        "repo": str(Path(repo_path).resolve()),
        "provider": provider_name,
        "allow_external": bool(allow_external),
        "max_tests": result.metadata.get("max_tests", None),
        "strategy": result.metadata.get("strategy", None),
        "tests": tests_meta,
        "redactions": all_redactions,
        "tokens_used": result.metadata.get("tokens_used", 0),
    }

    # append to metadata file atomically with a simple lock
    metadata_path = base / "metadata.json"
    lock_dir = base / ".lock"
    # try to acquire lock (mkdir is atomic); simple retry loop with basic
    # stale-lock detection.
    start = time.time()
    acquired = False
    while time.time() - start < 5:
        try:
            lock_dir.mkdir(parents=True, exist_ok=False)
            # write owner info for stale-lock detection
            try:
                owner = lock_dir / ".owner"
                with owner.open("w", encoding="utf-8") as f:
                    f.write(f"{os.getpid()}\n{time.time()}\n")
            except Exception:
                pass
            acquired = True
            break
        except FileExistsError:
            # attempt to detect stale lock
            try:
                owner = lock_dir / ".owner"
                if owner.exists():
                    with owner.open("r", encoding="utf-8") as f:
                        parts = f.read().splitlines()
                        ts = float(parts[1]) if len(parts) > 1 else None
                    if ts and (time.time() - ts) > 30:
                        # stale according to timestamp; try to remove
                        try:
                            # remove owner file then rmdir to handle platforms
                            # where rmdir fails if directory not empty (Windows)
                            try:
                                owner.unlink()
                            except Exception:
                                pass
                            lock_dir.rmdir()
                        except Exception:
                            pass
            except Exception:
                pass
            time.sleep(0.05)

    if not acquired:
        # clean up tmp dir if we couldn't acquire lock
        try:
            if tmp_out_dir.exists():
                shutil.rmtree(tmp_out_dir)
        except Exception:
            pass
        raise RuntimeError("could not acquire metadata lock")

    try:
        # Move temp directory into place first so files exist before metadata
        # references them. If the move fails we abort and clean up the temp
        # directory to avoid leaving partial state.
        final_out = base / "tests" / gen_id
        try:
            os.replace(str(tmp_out_dir), str(final_out))
        except Exception:
            try:
                shutil.move(str(tmp_out_dir), str(final_out))
            except Exception:
                try:
                    if tmp_out_dir.exists():
                        shutil.rmtree(tmp_out_dir)
                except Exception:
                    pass
                raise

        # best-effort: snapshot existing metadata into a per-generation backup
        try:
            backups_dir = base / "backups" / gen_id
            backups_dir.mkdir(parents=True, exist_ok=True)
            if metadata_path.exists():
                shutil.copy2(str(metadata_path), str(backups_dir / f"metadata.json.bak.{int(time.time())}"))
        except Exception:
            # don't fail the apply for backup failures
            pass

        # Now update metadata to include the new generation
        try:
            entries = _load_metadata(metadata_path)
            entries.append(meta_entry)
            _write_metadata_atomic(metadata_path, entries)
        except Exception:
            # metadata write failed; attempt to remove the moved generation to
            # avoid orphaning files that won't be discoverable via metadata.
            try:
                if final_out.exists():
                    shutil.rmtree(final_out)
            except Exception:
                pass
            raise
    finally:
        try:
            owner = lock_dir / ".owner"
            if owner.exists():
                try:
                    owner.unlink()
                except Exception:
                    pass
        except Exception:
            pass
        try:
            lock_dir.rmdir()
        except Exception:
            pass

    return meta_entry


def revert_generation(repo_path: str, generation_id: str, yes: bool = False) -> bool:
    base = Path(repo_path) / ".gstack_gen"
    metadata_path = base / "metadata.json"
    # interactive confirmation
    if not yes:
        resp = input(f"Revert generation {generation_id}? This will delete {base / 'tests' / generation_id} (y/N): ")
        if resp.strip().lower() not in ("y", "yes"):
            print("Cancelled")
            return False

    # Acquire same simple lock used by apply_generation to avoid races when
    # multiple processes update metadata concurrently.
    lock_dir = base / ".lock"
    start = time.time()
    acquired = False
    while time.time() - start < 5:
        try:
            lock_dir.mkdir(parents=True, exist_ok=False)
            try:
                owner = lock_dir / ".owner"
                with owner.open("w", encoding="utf-8") as f:
                    f.write(f"{os.getpid()}\n{time.time()}\n")
            except Exception:
                pass
            acquired = True
            break
        except FileExistsError:
            # stale-lock detection
            try:
                owner = lock_dir / ".owner"
                if owner.exists():
                    with owner.open("r", encoding="utf-8") as f:
                        parts = f.read().splitlines()
                        ts = float(parts[1]) if len(parts) > 1 else None
                    if ts and (time.time() - ts) > 30:
                        try:
                            try:
                                owner.unlink()
                            except Exception:
                                pass
                            lock_dir.rmdir()
                        except Exception:
                            pass
            except Exception:
                pass
            time.sleep(0.05)

    if not acquired:
        raise RuntimeError("could not acquire metadata lock")

    try:
        entries = _load_metadata(metadata_path)
        entry = None
        for e in entries:
            if e.get("generation_id") == generation_id:
                entry = e
                break
        if entry is None:
            raise KeyError(f"generation id not found: {generation_id}")

        # rename directory to a tombstone name first so metadata update is
        # the point of truth. This avoids races where files are deleted but
        # metadata update fails.
        gen_dir = base / "tests" / generation_id
        tomb = base / "tests" / f".deleted.{generation_id}.{int(time.time())}"
        if gen_dir.exists():
            try:
                gen_dir.rename(tomb)
            except Exception:
                # fall back to move
                try:
                    shutil.move(str(gen_dir), str(tomb))
                except Exception:
                    # if we cannot move, continue; we'll attempt deletion
                    pass

        # remove entry from metadata and write back
        new_entries = [e for e in entries if e.get("generation_id") != generation_id]
        _write_metadata_atomic(metadata_path, new_entries)

        # Now remove the tomb directory if it exists
        if tomb.exists():
            try:
                shutil.rmtree(tomb)
            except Exception:
                # leave tomb for operator inspection
                pass
    finally:
        try:
            owner = lock_dir / ".owner"
            if owner.exists():
                try:
                    owner.unlink()
                except Exception:
                    pass
        except Exception:
            pass
        try:
            lock_dir.rmdir()
        except Exception:
            pass

    return True


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="gstack-ai-test", description="gstack_test_ai CLI (preview/apply/revert)")
    sub = p.add_subparsers(dest="cmd")

    gen = sub.add_parser("generate", help="Generate tests (preview by default)")
    gen.add_argument("--repo", default=".", help="Repo path to analyze")
    gen.add_argument("--max", type=int, default=5)
    gen.add_argument("--strategy", default="coverage")
    gen.add_argument("--provider", default="localmock")
    gen.add_argument("--allow-external", action="store_true")
    gen.add_argument("--apply", action="store_true", help="Write validated tests to .gstack_gen/tests/<generation-id>/ and record metadata")

    rev = sub.add_parser("revert", help="Revert an applied generation")
    rev.add_argument("generation_id")
    rev.add_argument("--repo", default=".")
    rev.add_argument("--yes", action="store_true", help="Skip confirmation")

    return p


def main(argv: Optional[List[str]] = None):
    parser = _build_parser()
    args = parser.parse_args(argv)
    try:
        if args.cmd == "generate":
            allow_ext_env = os.environ.get("GSTACK_AI_ALLOW_EXTERNAL", "").lower()
            allow_ext = args.allow_external or allow_ext_env in ("1", "true", "yes")
            res, preview = preview_generation(repo_path=args.repo, max_tests=args.max, strategy=args.strategy, provider_name=args.provider, allow_external=allow_ext)
            print(preview)
            if args.apply:
                meta = apply_generation(res, repo_path=args.repo, provider_name=args.provider, allow_external=allow_ext)
                print(f"Applied generation: {meta['generation_id']}")
        elif args.cmd == "revert":
            ok = revert_generation(repo_path=args.repo, generation_id=args.generation_id, yes=args.yes)
            print("Reverted" if ok else "No-op")
        else:
            parser.print_help()
    except Exception as e:
        # friendly error and non-zero exit
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
