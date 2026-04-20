from gstack_test_ai.policy import validate_code


def test_block_subscript_call_bypass():
    code = "__builtins__['open']('f','w')\n"
    ok, reason = validate_code(code)
    assert not ok
    assert 'subscript' in (reason or '') or 'unsupported target' in (reason or '')


def test_block_shutil_rmtree():
    code = "import shutil\nshutil.rmtree('/tmp/something')\n"
    ok, reason = validate_code(code)
    assert not ok
    assert 'blocked import' in (reason or '') or 'blocked attribute' in (reason or '')
