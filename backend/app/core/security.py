import hmac
import hashlib

from app.core.config import settings


def pseudonymize(citizen_id: str) -> str:
    """Return a stable privacy token for a citizenId.

    Formula per plan.md: "cit_" + hmac_sha256(PSEUDONYM_SECRET, citizenId)[:16]
    """
    digest = hmac.new(
        settings.PSEUDONYM_SECRET.encode(),
        citizen_id.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"cit_{digest[:16]}"
