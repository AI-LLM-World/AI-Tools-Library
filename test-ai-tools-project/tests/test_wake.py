import re
from src.paperclip_wake.wake import build_wake, validate_wake


def test_build_and_validate_minimal():
    w = build_wake("tester")
    assert isinstance(w, dict)
    assert w["source"] == "tester"
    assert "id" in w and isinstance(w["id"], str)
    assert "timestamp" in w and isinstance(w["timestamp"], str)
    assert w["priority"] == "medium"
    assert validate_wake(w) is True


def test_build_with_payload_and_priority():
    p = {"foo": "bar"}
    w = build_wake("svc", p, priority="high")
    assert w["payload"] == p
    assert w["priority"] == "high"
    assert validate_wake(w) is True


def test_validate_missing_fields_raises():
    try:
        validate_wake({})
        assert False, "validate_wake should have raised"
    except ValueError as e:
        assert "missing required field" in str(e)


def test_priority_invalid_raises():
    w = build_wake("s")
    w["priority"] = "urgent"
    try:
        validate_wake(w)
        assert False
    except ValueError as e:
        assert "priority must be one of" in str(e)
