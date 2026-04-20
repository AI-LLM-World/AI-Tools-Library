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
    # Try direct parse first (covers both objects and arrays)
    try:
        return json.loads(text)
    except Exception:
        pass

    # Attempt to extract a JSON object or array substring.
    # Use a non-greedy search and try each match until one parses cleanly.
    pattern = re.compile(r"(\{(?:.|\n)*?\}|\[(?:.|\n)*?\])", re.S)
    for m in pattern.finditer(text):
        candidate = m.group(1)
        try:
            return json.loads(candidate)
        except Exception:
            # try next match
            continue
    return None


def _validate_code(code: str) -> Tuple[bool, str | None]:
    # Syntax validation
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return False, f"syntax error: {e}"
    # Conservative two-pass analysis inspired by CLI validation: build an
    # import alias map, catch unsafe imports, then inspect calls/attributes.
    unsafe_imports = {
        "subprocess",
        "socket",
        "requests",
        "importlib",
        "urllib",
        "urllib3",
        "http",
        "ftplib",
        "smtplib",
        "paramiko",
        "telnetlib",
        "websocket",
        "websockets",
        "multiprocessing",
        "psutil",
        "boto3",
        "builtins",
    }

    # Names that are unsafe when called directly
    unsafe_calls = {
        "open",
        "eval",
        "exec",
        "compile",
        "__import__",
        "input",
        "getattr",
        "setattr",
        "delattr",
        "globals",
        "locals",
        "vars",
        "dir",
    }

    # Dangerous attribute names (system/popen/run/open etc)
    unsafe_attrs = {"system", "popen", "run", "open", "exec", "eval", "check_output", "Popen"}

    alias_map: Dict[str, str] = {}

    # First pass: inspect imports and populate alias_map and catch simple unsafe imports
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for n in getattr(node, "names", []):
                top = n.name.split(".")[0]
                if top in unsafe_imports:
                    return False, f"blocked import: {n.name}"
                asname = n.asname or n.name.split(".")[0]
                alias_map[asname] = n.name

        elif isinstance(node, ast.ImportFrom):
            module = node.module or ""
            top = module.split(".")[0] if module else ""
            if top in unsafe_imports:
                return False, f"blocked import: {module}"
            # explicitly block dangerous from-imports from 'os' (e.g. from os import system)
            for n in getattr(node, "names", []):
                name = n.name
                asname = n.asname or name
                full = f"{module}.{name}" if module else name
                if module == "os" and name in ("system", "popen", "popen2", "popen3", "popen4"):
                    return False, f"blocked import: {full}"
                alias_map[asname] = full

    # Second pass: inspect calls and attribute access
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            func = node.func

            # Direct name call: open(...), eval(...), getattr(...)
            if isinstance(func, ast.Name):
                if func.id in unsafe_calls:
                    return False, f"blocked call: {func.id}"
                mapped = alias_map.get(func.id)
                if mapped:
                    if mapped.split(".")[0] in unsafe_imports or mapped.startswith("os."):
                        return False, f"blocked call (via import): {mapped}"

            # Attribute calls: os.system(...), o.system(...) where o was aliased
            elif isinstance(func, ast.Attribute):
                attr_chain: List[str] = []
                cur = func
                while isinstance(cur, ast.Attribute):
                    attr_chain.append(cur.attr)
                    cur = cur.value
                if isinstance(cur, ast.Name):
                    attr_chain.append(cur.id)
                full = ".".join(reversed(attr_chain))

                # resolve alias for top-level name if present
                parts = full.split(".") if full else []
                if parts:
                    top = parts[0]
                    real_top = alias_map.get(top, top)
                    if real_top != top:
                        rest = parts[1:]
                        full_real = real_top + ("." + ".".join(rest) if rest else "")
                    else:
                        full_real = full
                else:
                    full_real = full

                if full_real.startswith("os.") or full_real.startswith("subprocess") or full_real.split(".")[0] in unsafe_imports:
                    return False, f"blocked attribute call: {full_real}"

                if attr_chain:
                    outer = attr_chain[0]
                    if outer in unsafe_attrs or outer.lower() in {a.lower() for a in unsafe_calls}:
                        return False, f"blocked attribute call: {full_real or outer}"

            # Indirect calls: getattr(...)(...), __import__(...)(...), (importlib.import_module(...))(...)
            elif isinstance(func, ast.Call):
                inner = func.func
                if isinstance(inner, ast.Name):
                    if inner.id in unsafe_calls:
                        return False, f"blocked indirect call via: {inner.id}"
                    mapped = alias_map.get(inner.id)
                    if mapped and (mapped.split(".")[0] in unsafe_imports or mapped.startswith("os.")):
                        return False, f"blocked indirect call via import: {mapped}"
                elif isinstance(inner, ast.Attribute):
                    # reconstruct inner attribute chain
                    attr_chain2: List[str] = []
                    cur2 = inner
                    while isinstance(cur2, ast.Attribute):
                        attr_chain2.append(cur2.attr)
                        cur2 = cur2.value
                    if isinstance(cur2, ast.Name):
                        attr_chain2.append(cur2.id)
                    full2 = ".".join(reversed(attr_chain2)) if attr_chain2 else ""
                    if full2.startswith("os.") or full2.startswith("subprocess") or "importlib." in full2:
                        return False, f"blocked indirect attribute call: {full2}"

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
