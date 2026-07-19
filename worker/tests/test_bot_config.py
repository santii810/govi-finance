import os

import pytest

from worker.bot.config import BotConfig


def test_persona_for_user_owner_is_santi(monkeypatch):
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "test-token")
    monkeypatch.setenv("NOCODB_API_TOKEN", "test-nocodb")
    monkeypatch.setenv("TELEGRAM_OWNER_USER_ID", "111")
    config = BotConfig.from_env()
    assert config.persona_for_user(111) == "Santi"
    assert config.persona_for_user(999) is None


def test_persona_for_user_sandra_env(monkeypatch):
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "test-token")
    monkeypatch.setenv("NOCODB_API_TOKEN", "test-nocodb")
    monkeypatch.setenv("TELEGRAM_SANDRA_USER_ID", "222")
    config = BotConfig.from_env()
    assert config.persona_for_user(222) == "Sandra"


def test_persona_for_user_explicit_map(monkeypatch):
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "test-token")
    monkeypatch.setenv("NOCODB_API_TOKEN", "test-nocodb")
    monkeypatch.setenv("TELEGRAM_USER_PERSONAS", "333:Sandra,444:Santi")
    config = BotConfig.from_env()
    assert config.persona_for_user(333) == "Sandra"
    assert config.persona_for_user(444) == "Santi"


def test_invalid_persona_in_map_raises(monkeypatch):
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "test-token")
    monkeypatch.setenv("NOCODB_API_TOKEN", "test-nocodb")
    monkeypatch.setenv("TELEGRAM_USER_PERSONAS", "123:Invalid")
    with pytest.raises(RuntimeError, match="Persona inválida"):
        BotConfig.from_env()
