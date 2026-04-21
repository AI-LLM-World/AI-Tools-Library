import importlib.util
import json
import os
from pathlib import Path

import pytest


def _load_local_module(module_name: str, rel_path: str):
    p = Path(rel_path).resolve()
    spec = importlib.util.spec_from_file_location(module_name, str(p))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore[attr-defined]
    return mod


# load local modules from src/ to avoid collisions with installed packages
cli = _load_local_module("gstack_test_ai.cli", "src/gstack_test_ai/cli.py")
core = _load_local_module("gstack_test_ai.core", "src/gstack_test_ai/core.py")
TestCandidate = core.TestCandidate
GenerationResult = core.GenerationResult


def _make_result():
    tests = [
        TestCandidate(name="good", code="def good():\n    assert 1 == 1\n"),
        TestCandidate(name="bad", code="import subprocess\n"),
    ]
    meta = {"max_tests": 2, "strategy": "coverage", "tokens_used": 0}
    return GenerationResult(tests=tests, metadata=meta, parse_errors=[])


def test_apply_and_revert_happy_path(tmp_path):
    repo = tmp_path
    result = _make_result()

    meta_entry = cli.apply_generation(result, repo_path=str(repo), provider_name="localmock", allow_external=False)
    gen_id = meta_entry["generation_id"]

    base = repo / ".gstack_gen"
    # metadata file exists and contains the entry
    metadata_path = base / "metadata.json"
    assert metadata_path.exists()
    with metadata_path.open("r", encoding="utf-8") as f:
        entries = json.load(f)
    assert any(e.get("generation_id") == gen_id for e in entries)

    # the validated test file exists under .gstack_gen/tests/<gen_id>/
    gen_dir = base / "tests" / gen_id
    assert gen_dir.exists() and gen_dir.is_dir()
    files = list(gen_dir.iterdir())
    # only the validated 'good' test should have been written
    assert any("gstack_generated_good" in p.name for p in files)
    assert not any("gstack_generated_bad" in p.name for p in files)

    # Now revert
    ok = cli.revert_generation(repo_path=str(repo), generation_id=gen_id, yes=True)
    assert ok is True

    # metadata should no longer contain the generation
    with metadata_path.open("r", encoding="utf-8") as f:
        entries = json.load(f)
    assert not any(e.get("generation_id") == gen_id for e in entries)

    # generation directory should be removed
    assert not gen_dir.exists()


def test_apply_cleanup_on_metadata_write_failure(tmp_path, monkeypatch):
    repo = tmp_path
    result = _make_result()

    # Force metadata write to fail
    def fail_write(metadata_path, entries):
        raise RuntimeError("simulated metadata failure")

    monkeypatch.setattr(cli, "_write_metadata_atomic", fail_write)

    with pytest.raises(RuntimeError):
        cli.apply_generation(result, repo_path=str(repo), provider_name="localmock", allow_external=False)

    base = repo / ".gstack_gen"
    # Ensure no lingering generation directories under .gstack_gen/tests
    tests_dir = base / "tests"
    if tests_dir.exists():
        # should be empty
        assert not any(tests_dir.iterdir())
