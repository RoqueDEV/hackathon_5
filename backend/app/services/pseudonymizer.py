from app.core.security import pseudonymize


def get_token(citizen_id: str) -> str:
    """Return a stable pseudonym token for a citizen ID."""
    return pseudonymize(citizen_id)
