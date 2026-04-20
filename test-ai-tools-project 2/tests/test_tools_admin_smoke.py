import os
import urllib.request
import urllib.error
import pytest

# Base URL for smoke tests. CI should set SMOKE_API_BASE to the running service.
# If SMOKE_API_BASE is not set, skip the smoke tests so local runs are green.
BASE = os.environ.get("SMOKE_API_BASE")
if not BASE:
    # Skip entire module when no target service is provided.
    pytest.skip("SMOKE_API_BASE not set — skipping smoke tests", allow_module_level=True)


def _try_paths(paths):
    """Try a list of candidate paths on BASE and succeed if any return HTTP 200.

    This makes the smoke test resilient to small differences in the service
    (health vs root vs api path).
    """
    errors = []
    for path in paths:
        url = BASE.rstrip("/") + path
        try:
            with urllib.request.urlopen(url, timeout=5) as resp:
                if resp.status == 200:
                    return True
                errors.append(f"{url} returned status {resp.status}")
        except urllib.error.HTTPError as e:
            errors.append(f"{url} HTTPError {e.code}")
        except Exception as e:
            errors.append(f"{url} exception: {e}")
    pytest.fail("No reachable endpoint among tried paths:\n" + "\n".join(errors))


def test_tools_api_smoke():
    paths = ["/tools/health", "/tools", "/api/tools", "/api/v1/tools"]
    _try_paths(paths)


def test_admin_endpoints_smoke():
    paths = ["/admin/health", "/admin", "/api/admin", "/admin/status"]
    _try_paths(paths)
