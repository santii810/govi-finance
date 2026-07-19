from worker.accounts import Account, accounts_for_sender, load_accounts, resolve_account


def test_resolve_trade_republic_for_sandra():
    accounts = load_accounts()
    account, ambiguities = resolve_account(
        accounts, "trade_republic", sender_persona="Sandra"
    )
    assert account is not None
    assert account.id == "trade-republic-sandra"
    assert account.persona == "Sandra"
    assert ambiguities == []


def test_resolve_myinvestor_for_sandra():
    accounts = load_accounts()
    account, ambiguities = resolve_account(
        accounts, "myinvestor", sender_persona="Sandra"
    )
    assert account is not None
    assert account.id == "myinvestor-sandra"
    assert account.persona == "Sandra"
    assert ambiguities == []


def test_resolve_trade_republic_for_santi():
    accounts = load_accounts()
    account, ambiguities = resolve_account(
        accounts, "trade_republic", sender_persona="Santi"
    )
    assert account is not None
    assert account.id == "trade-republic-santi"
    assert ambiguities == []


def test_resolve_revolut_for_sandra_only_common():
    accounts = load_accounts()
    account, ambiguities = resolve_account(accounts, "revolut", sender_persona="Sandra")
    assert account is not None
    assert account.id == "revolut-comun"
    assert ambiguities == []


def test_resolve_revolut_for_santi_is_ambiguous():
    accounts = load_accounts()
    account, ambiguities = resolve_account(accounts, "revolut", sender_persona="Santi")
    assert account is None
    assert ambiguities
    assert "revolut-santi" in ambiguities[0]
    assert "revolut-comun" in ambiguities[0]


def test_resolve_without_sender_persona_is_ambiguous_for_trade_republic():
    accounts = load_accounts()
    account, ambiguities = resolve_account(accounts, "trade_republic")
    assert account is None
    assert ambiguities


def test_accounts_for_sender_excludes_other_personal_accounts():
    accounts = [
        Account(
            id="revolut-santi",
            label="Revolut Santi",
            banco="Revolut",
            tipo="personal",
            persona="Santi",
            parser="revolut",
            detection={},
        ),
        Account(
            id="revolut-comun",
            label="Revolut Común",
            banco="Revolut",
            tipo="conjunta",
            persona="Común",
            parser="revolut",
            detection={},
        ),
    ]
    allowed = accounts_for_sender(accounts, "revolut", "Sandra")
    assert [a.id for a in allowed] == ["revolut-comun"]
