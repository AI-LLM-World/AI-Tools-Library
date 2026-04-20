"""Implementation of wake payload builder and validator."""
from datetime import datetime, timezone
import uuid


def _now_iso() -> str:
    # Return current UTC time in ISO 8601 format
    return datetime.now(timezone.utc).isoformat()


def build_wake(source: str, payload: dict | None = None, *, id: str | None = None, timestamp: str | None = None, priority: str | None = None) -> dict:
    """Build a wake payload dict using the canonical schema.

    Args:
        source: origin component name (required)
        payload: optional arbitrary object
        id: optional uuid string; if omitted a v4 uuid is generated
        timestamp: optional ISO8601 timestamp string; defaults to now UTC
        priority: optional priority string; if provided must be one of 'low','medium','high'

    Returns:
        dict: wake payload
    """
    if not source or not isinstance(source, str):
        raise ValueError("source is required and must be a non-empty string")

    if id is None:
        id = str(uuid.uuid4())

    if timestamp is None:
        timestamp = _now_iso()

    if priority is None:
        priority = "medium"

    wake = {
        "id": id,
        "timestamp": timestamp,
        "source": source,
        "priority": priority,
    }

    if payload is not None:
        wake["payload"] = payload

    return wake


def validate_wake(wake: dict) -> bool:
    """Validate a wake payload. Raises ValueError for invalid payloads.

    Returns True when valid.
    """
    if not isinstance(wake, dict):
        raise ValueError("wake must be a dict")

    required = ["id", "timestamp", "source"]
    for k in required:
        if k not in wake:
            raise ValueError(f"missing required field: {k}")

    if not isinstance(wake["id"], str) or not wake["id"]:
        raise ValueError("id must be a non-empty string")

    if not isinstance(wake["timestamp"], str) or not wake["timestamp"]:
        raise ValueError("timestamp must be a non-empty ISO8601 string")

    if not isinstance(wake["source"], str) or not wake["source"]:
        raise ValueError("source must be a non-empty string")

    if "priority" in wake:
        if wake["priority"] not in ("low", "medium", "high"):
            raise ValueError("priority must be one of 'low', 'medium', 'high'")

    return True
