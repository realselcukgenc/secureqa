"""REST API security regression checks against SecureShop's JSON API.

(TR: SecureShop JSON API'sine karşı API güvenliği regresyon kontrolleri.)

Every test here is marked ``@pytest.mark.api`` and records a defensive
:class:`~secureqa.checks.Check`. Against the securely-built API they all PASS.
"""
