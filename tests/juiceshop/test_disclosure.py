"""Sensitive-data, file-access and logging disclosures against OWASP Juice Shop.

These exercise resources that should not be reachable: confidential blueprints, forgotten
backups, server access logs, poison-null-byte file reads, and hidden/unreleased assets. Each
is confirmed via ``GET /api/Challenges``. Spans A02, A03, A05 and A09. Marked ``juiceshop``
and skipped when Juice Shop is not running.
"""

from __future__ import annotations

import pytest

from tests.juiceshop._helpers import record_if_solved

pytestmark = [pytest.mark.juiceshop]


@pytest.mark.owasp_a02
def test_retrieve_blueprint(juice, record_finding) -> None:
    """The confidential product blueprint should be downloadable from the static folder."""
    ok, evidence = juice.get_blueprint()
    assert ok, f"Expected the blueprint file to be downloadable. {evidence}"
    assert record_if_solved(juice, "retrieveBlueprintChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Retrieve Blueprint' challenge as solved."
    )


@pytest.mark.owasp_a05
def test_forgotten_dev_backup(juice, record_finding) -> None:
    """A forgotten developer backup should be readable via a poison null byte."""
    ok, evidence = juice.poison_null_byte_file("package.json.bak")
    assert ok, f"Expected the developer backup to be readable. {evidence}"
    assert record_if_solved(juice, "forgottenDevBackupChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Forgotten Developer Backup' challenge as solved."
    )


@pytest.mark.owasp_a05
def test_forgotten_sales_backup(juice, record_finding) -> None:
    """A forgotten sales backup (old coupons) should be readable via a poison null byte."""
    ok, evidence = juice.poison_null_byte_file("coupons_2013.md.bak")
    assert ok, f"Expected the sales backup to be readable. {evidence}"
    assert record_if_solved(juice, "forgottenBackupChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Forgotten Sales Backup' challenge as solved."
    )


@pytest.mark.owasp_a03
def test_poison_null_byte(juice, record_finding) -> None:
    """A poison null byte should bypass the .md/.pdf allowlist and serve encrypt.pyc."""
    ok, evidence = juice.poison_null_byte_file("encrypt.pyc")
    assert ok, f"Expected the poison-null-byte file read to succeed. {evidence}"
    assert record_if_solved(juice, "nullByteChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Poison Null Byte' challenge as solved."
    )


@pytest.mark.owasp_a05
def test_missing_encoding(juice, record_finding) -> None:
    """Requesting the mis-encoded photo by its URL-encoded name should mark the challenge."""
    ok, evidence = juice.get_missing_encoding_image()
    assert ok, f"Expected the mis-encoded image request to be sent. {evidence}"
    assert record_if_solved(juice, "missingEncodingChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Missing Encoding' challenge as solved."
    )


@pytest.mark.owasp_a05
def test_token_sale_page(juice, record_finding) -> None:
    """Requesting the token-sale tracking pixel should reveal the hidden page."""
    ok, evidence = juice.access_padding_pixel("56px.png")
    assert ok, f"Expected the token-sale pixel request to be sent. {evidence}"
    assert record_if_solved(juice, "tokenSaleChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Blockchain Hype' (token sale) challenge as solved."
    )


@pytest.mark.owasp_a05
def test_extra_language_file(juice, record_finding) -> None:
    """Fetching the unreleased Klingon language file should mark the challenge."""
    ok, evidence = juice.get_i18n_file("tlh_AA.json")
    assert ok, f"Expected the extra language file to be readable. {evidence}"
    assert record_if_solved(juice, "extraLanguageChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Extra Language' challenge as solved."
    )


@pytest.mark.owasp_a09
@pytest.mark.xfail(
    reason="Access-log path varies by Juice Shop build/config; may 404 on some images.",
    strict=False,
)
def test_access_log_disclosure(juice, record_finding) -> None:
    """The server access log should be reachable under /support/logs (logging failure)."""
    ok, evidence = juice.get_access_log()
    assert ok, f"Expected the access log to be reachable. {evidence}"
    assert record_if_solved(juice, "accessLogDisclosureChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Access Log' challenge as solved."
    )
