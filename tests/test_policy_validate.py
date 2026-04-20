import pytest

from gstack_test_ai.policy import validate_code


def test_validate_good_simple():
    code = """
def add(a, b):
    return a + b

def test_add():
    assert add(1, 2) == 3
"""
    ok, reason = validate_code(code)
    assert ok, reason


def test_validate_block_subprocess_import():
    code = """
import subprocess

def test_do():
    subprocess.run(["echo", "hi"])
"""
    ok, reason = validate_code(code)
    assert not ok
    assert "blocked import" in reason


def test_validate_block_os_system_from_import():
    code = """
from os import system

def test_sys():
    system('ls')
"""
    ok, reason = validate_code(code)
    assert not ok
    assert "blocked import" in reason or "blocked attribute" in reason


def test_validate_block_eval_call():
    code = """
def test_eval():
    eval('1+1')
"""
    ok, reason = validate_code(code)
    assert not ok
    assert "blocked call" in reason
