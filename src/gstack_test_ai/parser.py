"""Model output parser for generated test code.

Accepts provider responses (dicts or strings), extracts test code blocks or structured JSON,
validates syntax and checks for unsafe imports/calls, and returns normalized test entries.
"""
from __future__ import annotations

import ast
import json
import re
from typing import Any, Dict, List, Tuple


def _extract_fenced_code(text: str) -> List[str]:
    pattern = re.compile(r"```(?:python)?\n(.*?)```", re.S | re.I)
    return [m.group(1).strip() for m in pattern.finditer(text)]


def _find_json_in_text(text: str) -> Any:
    # Try direct parse first
    try:
        return json.loads(text)
    except Exception:
        pass

    # Attempt to extract a JSON object substring
    m = re.search(r"(\{(?:.|\n)*\})", text)
    if m:
        candidate = m.group(1)
        try:
            return json.loads(candidate)
        except Exception:
            pass
    return None


def _validate_code(code: str) -> Tuple[bool, str | None]:
    # Syntax validation
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return False, f"syntax error: {e}"

    # Walk AST to find unsafe imports or calls
    unsafe_imports = {"subprocess", "socket", "requests"}
    unsafe_calls = {"open"}
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            for n in getattr(node, "names", []):
                if n.name.split(".")[0] in unsafe_imports:
                    return False, f"blocked import: {n.name}"
        if isinstance(node, ast.Call):
            func = node.func
            # func could be Name or Attribute
            if isinstance(func, ast.Name):
                if func.id in unsafe_calls:
                    return False, f"blocked call: {func.id}"
            elif isinstance(func, ast.Attribute):
                # check for os.system / os.popen / subprocess.* style calls
                attr_chain = []
                cur = func
                while isinstance(cur, ast.Attribute):
                    attr_chain.append(cur.attr)
                    cur = cur.value
                if isinstance(cur, ast.Name):
                    attr_chain.append(cur.id)
                full = ".".join(reversed(attr_chain))
                if full.startswith("os.") or full.startswith("subprocess"):
                    return False, f"blocked attribute call: {full}"

    return True, None


def _infer_name_from_code(code: str, default: str) -> str:
    try:
        tree = ast.parse(code)
    except Exception:
        return default
    for node in tree.body:
        if isinstance(node, ast.FunctionDef):
            return node.name
    return default


def parse_model_response(resp: Any) -> Tuple[List[Dict[str, str]], List[str], Dict[str, Any]]:
    """Parse provider response into a list of {name, code} dicts.

    Returns (tests, errors, metadata)
    """
    tests: List[Dict[str, str]] = []
    errors: List[str] = []
    metadata: Dict[str, Any] = {}

    # Helper to add validated test
    def _add_test(name: str, code: str):
        ok, reason = _validate_code(code)
        if not ok:
            errors.append(f"{name}: {reason}")
            return
        tests.append({"name": name, "code": code})

    # If provider returned a dict-like OpenAI style response
    if isinstance(resp, dict):
        # Common OpenAI format: {'choices': [{'text': '...'}]}
        if "choices" in resp and isinstance(resp["choices"], list):
            for choice in resp["choices"]:
                content = None
                if isinstance(choice, dict):
                    content = choice.get("text") or (choice.get("message") or {}).get("content")
                if content:
                    sub_tests, sub_errors, _ = parse_model_response(content)
                    tests.extend(sub_tests)
                    errors.extend(sub_errors)
            return tests, errors, metadata

        # Simple structured dict with 'tests'
        if "tests" in resp and isinstance(resp["tests"], list):
            for i, item in enumerate(resp["tests"]):
                if isinstance(item, dict):
                    name = item.get("name") or f"test_generated_{i}"
                    code = item.get("code") or item.get("body") or ""
                    if code:
                        _add_test(name, code)
                elif isinstance(item, str):
                    name = f"test_generated_{i}"
                    code = item
                    _add_test(name, code)
            return tests, errors, metadata

        # If dict contains a 'text' field, try parsing it
        if "text" in resp and isinstance(resp["text"], str):
            return parse_model_response(resp["text"])

        # Unknown dict format: try to JSON-serialize and parse text
        try:
            js = json.dumps(resp)
            sub = _find_json_in_text(js)
            if sub:
                return parse_model_response(sub)
        except Exception:
            pass

        errors.append("unrecognized provider dict format")
        return tests, errors, metadata

    # If provider returned a string
    if isinstance(resp, str):
        # Try to find JSON in text
        parsed = _find_json_in_text(resp)
        if parsed is not None:
            return parse_model_response(parsed)

        # Extract fenced code blocks
        blocks = _extract_fenced_code(resp)
        if blocks:
            for i, code in enumerate(blocks):
                name = _infer_name_from_code(code, f"test_from_block_{i}")
                _add_test(name, code)
            return tests, errors, metadata

        # As a last resort, treat whole string as a code block
        name = _infer_name_from_code(resp, "test_generated_0")
        _add_test(name, resp)
        return tests, errors, metadata

    # Unknown response type
    errors.append("unsupported provider response type: {}".format(type(resp)))
    return tests, errors, metadata
