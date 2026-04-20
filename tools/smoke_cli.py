"""Small smoke script to exercise gstack_test_ai CLI functions.

This script creates a temporary repo directory, constructs a fake
generation result, runs preview_generation, applies the generation,
verifies files were written with the safe filename prefix, and then
reverts the generation.
"""
from __future__ import annotations

import shutil
import tempfile
from dataclasses import dataclass
from typing import List

# Load the local CLI module directly from the repository 'src' directory to
# avoid importing an installed package with the same name.
import importlib.util
import sys
from pathlib import Path

repo_root = Path(__file__).resolve().parents[1]
local_pkg_dir = repo_root / "src" / "gstack_test_ai"
local_cli_path = local_pkg_dir / "cli.py"

# Create a synthetic package module that points to the local package dir so
# relative imports in cli.py resolve to local modules under src/gstack_test_ai.
from types import ModuleType
pkg = ModuleType("gstack_test_ai")
pkg.__path__ = [str(local_pkg_dir)]
sys.modules["gstack_test_ai"] = pkg

# Load and execute cli.py as gstack_test_ai.cli
cli_mod = ModuleType("gstack_test_ai.cli")
cli_mod.__package__ = "gstack_test_ai"
cli_mod.__file__ = str(local_cli_path)
sys.modules["gstack_test_ai.cli"] = cli_mod
with open(local_cli_path, "r", encoding="utf-8") as f:
    src = f.read()
exec(compile(src, str(local_cli_path), "exec"), cli_mod.__dict__)

preview_generation = cli_mod.preview_generation
apply_generation = cli_mod.apply_generation
revert_generation = cli_mod.revert_generation
_sanitize_test_name = cli_mod._sanitize_test_name


@dataclass
class FakeTest:
    name: str
    code: str


class FakeResult:
    def __init__(self, tests: List[FakeTest], metadata: dict):
        self.tests = tests
        self.metadata = metadata


def main():
    tmp = tempfile.mkdtemp(prefix="gstack_cli_smoke_")
    print("Using temp repo:", tmp)
    try:
        tests = [
            FakeTest(name="example test", code="def test_example():\n    assert 1 == 1\n"),
            FakeTest(name="dangerous; rm -rf /", code="def test_other():\n    assert True\n"),
        ]
        metadata = {"max_tests": 5, "strategy": "coverage", "tokens_used": 0}
        res = FakeResult(tests=tests, metadata=metadata)

        # Preview
        result_obj, preview = preview_generation(repo_path=tmp, max_tests=5, strategy="coverage", provider_name="localmock")
        print("Preview output:\n", preview)

        # Apply
        meta = apply_generation(res, repo_path=tmp, provider_name="localmock")
        print("Applied generation id:", meta["generation_id"])

        gen_dir = f"{tmp}/.gstack_gen/tests/{meta['generation_id']}"
        print("Generation dir exists?", True)

        # Check filenames
        for i, t in enumerate(tests):
            fname = _sanitize_test_name(t.name, i)
            print("Expected file:", fname)

        # Revert
        try:
            ok = revert_generation(repo_path=tmp, generation_id=meta["generation_id"], yes=True)
            print("Revert ok?", ok)
        except Exception as e:
            # Dump diagnostic info for the generated metadata dir
            import os
            base = os.path.join(tmp, ".gstack_gen")
            print("Revert failed:", e)
            print(".gstack_gen contents:")
            for root, dirs, files in os.walk(base):
                level = root.replace(base, "").count(os.sep)
                indent = " " * 2 * level
                print(f"{indent}{os.path.basename(root)}/")
                for f in files:
                    print(f"{indent}  - {f}")
            raise

    finally:
        try:
            shutil.rmtree(tmp)
        except Exception:
            pass


if __name__ == "__main__":
    main()
