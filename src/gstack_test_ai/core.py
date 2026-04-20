"""Minimal core module for gstack_test_ai used by the CLI and tests.

This is a small, self-contained stub that provides GenerationResult and
generate_tests so the CLI preview/apply/revert functions can be exercised
in isolation for smoke tests.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Dict


@dataclass
class TestCandidate:
    name: str
    code: str


@dataclass
class GenerationResult:
    tests: List[TestCandidate]
    metadata: Dict
    parse_errors: List[str]


def generate_tests(repo_path: str = ".", max_tests: int = 5, strategy: str = "coverage", provider=None, dry_run: bool = True, allow_external: bool = False) -> GenerationResult:
    """Return a fake GenerationResult with simple test candidates for preview.

    This stub is intentionally deterministic and lightweight for local
    testing and smoke runs.
    """
    tests = []
    for i in range(max_tests):
        tests.append(TestCandidate(name=f"test_mock_{i}", code=f"def test_mock_{i}():\n    assert {i} == {i}\n"))

    metadata = {"max_tests": max_tests, "strategy": strategy, "tokens_used": 0}
    return GenerationResult(tests=tests, metadata=metadata, parse_errors=[])
