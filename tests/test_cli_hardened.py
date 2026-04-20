import importlib.util
import sys
from types import ModuleType
from pathlib import Path
import time


def _load_local_cli_module():
    repo_root = Path(__file__).resolve().parents[1]
    pkg_dir = repo_root / "src" / "gstack_test_ai"
    cli_path = pkg_dir / "cli.py"

    # create package module pointing to local package dir
    pkg = ModuleType("gstack_test_ai")
    pkg.__path__ = [str(pkg_dir)]
    sys.modules["gstack_test_ai"] = pkg

    # load cli as submodule
    mod_name = "gstack_test_ai.cli"
    cli_mod = ModuleType(mod_name)
    cli_mod.__package__ = "gstack_test_ai"
    cli_mod.__file__ = str(cli_path)
    sys.modules[mod_name] = cli_mod
    src = cli_path.read_text(encoding="utf-8")
    exec(compile(src, str(cli_path), "exec"), cli_mod.__dict__)
    return cli_mod


def test_sanitize_prefix():
    cli = _load_local_cli_module()
    name = cli._sanitize_test_name("example test", 0)
    assert name.startswith("gstack_generated_")
    assert not name.startswith("test_")


def test_load_metadata_corrupt_backup(tmp_path):
    cli = _load_local_cli_module()
    base = tmp_path / ".gstack_gen"
    base.mkdir()
    metadata = base / "metadata.json"
    # write invalid JSON
    metadata.write_text("{invalid json\n", encoding="utf-8")

    try:
        cli._load_metadata(metadata)
        raised = False
    except RuntimeError:
        raised = True

    assert raised
    # backup file should exist with .corrupt.<ts>
    found = list(base.glob("metadata.json.corrupt.*"))
    assert found, "corrupt backup not created"


def test_apply_with_stale_lock(tmp_path):
    cli = _load_local_cli_module()
    # simulate a stale lock
    base = tmp_path / ".gstack_gen"
    lock = base / ".lock"
    lock.mkdir(parents=True)
    owner = lock / ".owner"
    old_ts = time.time() - 120
    owner.write_text(f"12345\n{old_ts}\n", encoding="utf-8")

    # create a fake generation result structure expected by apply_generation
    class FakeTest:
        def __init__(self, name, code):
            self.name = name
            self.code = code

    class FakeResult:
        def __init__(self):
            self.tests = [FakeTest("one", "def test_one():\n    assert True\n")]
            self.metadata = {"max_tests": 1, "strategy": "coverage", "tokens_used": 0}

    res = FakeResult()

    meta = cli.apply_generation(res, repo_path=str(tmp_path), provider_name="localmock")
    assert "generation_id" in meta
    gen_id = meta["generation_id"]
    tests_dir = base / "tests" / gen_id
    assert tests_dir.exists()
    # lock should be removed after successful apply
    assert not lock.exists()
