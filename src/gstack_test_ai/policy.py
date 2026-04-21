"""Canonical policy and validation helpers for gstack_test_ai.

This module centralizes unsafe/allow lists and provides validate_code()
so parser.py and cli.py share the same conservative checks.
"""
from __future__ import annotations

import ast
from typing import Dict, List, Tuple, Optional

# Conservative deny-list of top-level modules that can perform network/OS/subprocess
# or otherwise escape the test execution sandbox.
UNSAFE_IMPORTS = {
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
    "pkgutil",
    "pkg_resources",
    "builtins",
    # Block shutil: contains rmtree/move/other destructive filesystem helpers
    "shutil",
}

# Names that are unsafe when called directly
UNSAFE_CALLS = {
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
UNSAFE_ATTRS = {
    "system",
    "popen",
    "run",
    "open",
    "exec",
    "eval",
    "check_output",
    "Popen",
    # filesystem-destructive attribute names
    "remove",
    "unlink",
    "rmdir",
    "rmtree",
    "rename",
    "replace",
}


def validate_code(code: str) -> Tuple[bool, Optional[str]]:
    """Validate code using AST checks.

    Returns (ok, reason) where reason is set on failure.
    """
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return False, f"syntax error: {e}"

    alias_map: Dict[str, str] = {}

    # First pass: inspect imports and populate alias_map and catch simple unsafe imports
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for n in getattr(node, "names", []):
                top = n.name.split(".")[0]
                if top in UNSAFE_IMPORTS:
                    return False, f"blocked import: {n.name}"
                asname = n.asname or n.name.split(".")[0]
                alias_map[asname] = n.name

        elif isinstance(node, ast.ImportFrom):
            module = node.module or ""
            top = module.split(".")[0] if module else ""
            if top in UNSAFE_IMPORTS:
                return False, f"blocked import: {module}"
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

            # Conservative safety rule: block calls where the call target is a
            # computed/subscript expression (e.g. __builtins__['open'](...)) or
            # any other unexpected AST node type used as the call target. Deny
            # these forms because they can be used to retrieve dangerous
            # callables at runtime and are difficult to reason about statically.
            if not isinstance(func, (ast.Name, ast.Attribute, ast.Call)):
                if isinstance(func, ast.Subscript):
                    return False, "blocked call via subscript expression"
                return False, f"blocked indirect call via unsupported target: {type(func).__name__}"

            # Direct name call: open(...), eval(...), getattr(...)
            if isinstance(func, ast.Name):
                if func.id in UNSAFE_CALLS:
                    return False, f"blocked call: {func.id}"
                mapped = alias_map.get(func.id)
                if mapped:
                    if mapped.split(".")[0] in UNSAFE_IMPORTS or mapped.startswith("os."):
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

                if full_real.startswith("os.") or full_real.startswith("subprocess") or full_real.split(".")[0] in UNSAFE_IMPORTS:
                    return False, f"blocked attribute call: {full_real}"

                if attr_chain:
                    outer = attr_chain[0]
                    if outer in UNSAFE_ATTRS or outer.lower() in {a.lower() for a in UNSAFE_CALLS}:
                        return False, f"blocked attribute call: {full_real or outer}"

            # Indirect calls: getattr(...)(...), __import__(...)(...),
            # (importlib.import_module(...))(...), or other call-returning-call forms.
            elif isinstance(func, ast.Call):
                inner = func.func
                # Be conservative: if the inner call's target is not a simple Name
                # or Attribute, block it. Patterns like (lambda: open)()(...)
                # or (some_factory())(...) are dynamic and can return unsafe
                # callables at runtime.
                if not isinstance(inner, (ast.Name, ast.Attribute)):
                    return False, f"blocked indirect call via unsupported inner target: {type(inner).__name__}"

                if isinstance(inner, ast.Name):
                    if inner.id in UNSAFE_CALLS:
                        return False, f"blocked indirect call via: {inner.id}"
                    mapped = alias_map.get(inner.id)
                    if mapped and (mapped.split(".")[0] in UNSAFE_IMPORTS or mapped.startswith("os.")):
                        return False, f"blocked indirect call via import: {mapped}"
                elif isinstance(inner, ast.Attribute):
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
