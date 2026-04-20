import sys
from pathlib import Path
import importlib.util

repo = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo / 'src'))
sys.path.insert(0, str(repo))

print('sys.path:')
for p in sys.path[:5]:
    print('  ', p)

print('find_spec gstack_test_ai ->', importlib.util.find_spec('gstack_test_ai'))
print('find_spec gstack_test_ai.policy ->', importlib.util.find_spec('gstack_test_ai.policy'))

try:
    import gstack_test_ai.policy as p
    print('imported policy module at', p.__file__)
except Exception as e:
    print('import error:', type(e).__name__, e)
