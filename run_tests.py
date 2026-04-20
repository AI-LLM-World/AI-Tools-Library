import sys
from pathlib import Path

repo = Path(__file__).resolve().parent
# Ensure both repo root and src/ are on sys.path so tests can import the package
sys.path.insert(0, str(repo / 'src'))
sys.path.insert(0, str(repo))

import importlib.util
import types

# Ensure our local gstack_test_ai package is preferred by creating a package
# module and loading the local policy.py directly into sys.modules. This
# avoids an externally installed package shadowing our local package.
pkg_name = 'gstack_test_ai'
pkg_path = repo / 'src' / pkg_name
policy_path = pkg_path / 'policy.py'

if str(pkg_name) not in sys.modules:
    pkg = types.ModuleType(pkg_name)
    pkg.__path__ = [str(pkg_path)]
    sys.modules[pkg_name] = pkg

spec = importlib.util.spec_from_file_location(f"{pkg_name}.policy", str(policy_path))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
sys.modules[f"{pkg_name}.policy"] = module

import tests.test_policy_validate as t

cases = [t.test_validate_good_simple, t.test_validate_block_subprocess_import, t.test_validate_block_os_system_from_import, t.test_validate_block_eval_call]
failed = 0
for f in cases:
    try:
        f()
        print(f.__name__, 'OK')
    except AssertionError as e:
        failed += 1
        print(f.__name__, 'FAILED', e)
    except Exception as e:
        failed += 1
        print(f.__name__, 'ERROR', e)

if failed:
    sys.exit(1)
