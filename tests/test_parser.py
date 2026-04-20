from gstack_test_ai.parser import parse_model_response


def test_parse_structured_tests():
    resp = {"tests": [{"name": "t1", "code": "def test_t1():\n    assert 1==1\n"}]}
    tests, errors, meta = parse_model_response(resp)
    assert len(tests) == 1
    assert not errors


def test_parse_choices_text():
    resp = {"choices": [{"text": "{""tests"": [{\"name\": \"c1\", \"code\": \"def test_c1():\\n    assert True\\n\"}]}"}]
    tests, errors, meta = parse_model_response(resp)
    assert len(tests) == 1


def test_parse_fenced_code_and_blocked_import():
    text = "Here is code:\n```python\nimport subprocess\ndef test_bad():\n    subprocess.run(['echo','x'])\n```"
    tests, errors, meta = parse_model_response(text)
    assert not tests
    assert any("blocked import" in e or "blocked attribute call" in e or "blocked call" in e for e in errors)
