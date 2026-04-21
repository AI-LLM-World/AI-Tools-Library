"""gstack_test_ai package initializer for local test runs.

This file ensures the local src/gstack_test_ai package is importable by tests
and development tooling. Keep intentionally minimal.
"""

from .policy import validate_code

__all__ = ["validate_code"]
