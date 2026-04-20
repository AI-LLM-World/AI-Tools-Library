"""Minimal providers stub for gstack_test_ai used by the CLI.

This provides a LocalMockProvider class used by the CLI preview and
apply paths in the smoke script. It's intentionally minimal for local
testing.
"""
from __future__ import annotations


class LocalMockProvider:
    """Placeholder provider that mimics the interface expected by the CLI.

    The real provider would contact an LLM or external service; for smoke
    tests we don't need any behavior.
    """
    def __init__(self):
        pass
