"""Unit tests for pseudonymizer."""

import pytest

from app.services.pseudonymizer import get_token


def test_token_format():
    token = get_token("123456789")
    assert token.startswith("cit_")
    assert len(token) == 4 + 16  # "cit_" + 16 hex chars


def test_token_stable():
    """Same citizen ID always produces the same token."""
    assert get_token("abc") == get_token("abc")


def test_token_differs():
    """Different citizen IDs produce different tokens."""
    assert get_token("aaa") != get_token("bbb")


def test_token_no_pii():
    """Token must not contain the raw citizen ID."""
    citizen_id = "123456789"
    token = get_token(citizen_id)
    assert citizen_id not in token
