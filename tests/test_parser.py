from gstack_test_ai.parser import parse_model_response


def test_parse_structured_tests():
    resp = {"tests": [{"name": "t1", "code": "def test_t1():\n    assert 1==1\n"}]}
    tests, errors, meta = parse_model_response(resp)
    assert len(tests) == 1
    assert not errors


def test_parse_choices_text():
    # choices.text contains a JSON string with tests
    resp = {"choices": [{"text": '{"tests": [{"name": "c1", "code": "def test_c1():\\n    assert True\\n"}] }'}]}
    tests, errors, meta = parse_model_response(resp)
    assert len(tests) == 1


def test_parse_fenced_code_and_blocked_import():
    text = "Here is code:\n```python\nimport subprocess\ndef test_bad():\n    subprocess.run(['echo','x'])\n```"
    tests, errors, meta = parse_model_response(text)
    assert not tests
    assert any("blocked import" in e or "blocked attribute call" in e or "blocked call" in e for e in errors)


def test_blocked_import_from_and_attribute_open():
    # from subprocess import Popen should be blocked
    text = "from subprocess import Popen\ndef t():\n    Popen(['echo','x'])\n"
    tests, errors, meta = parse_model_response(text)
    assert not tests
    # parser reports blocked imports as 'blocked import: <module>'
    assert any("blocked import" in e or "blocked attribute call" in e for e in errors)


def test_blocked_path_open_attribute():
    # Path.open or os.open style calls should be blocked
    text = "from pathlib import Path\n\np = Path('f')\np.open('r')\n"
    tests, errors, meta = parse_model_response(text)
    assert not tests
    assert any("blocked attribute call" in e or "blocked call" in e for e in errors)
