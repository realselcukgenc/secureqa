"""SQLite database helpers for SecureShop (TR: veritabanı yardımcıları).

What lives here:

* ``get_db()``      – one sqlite3 connection per request, stored on ``flask.g``.
* ``init_db()``     – creates the tables and fills them with demo data (seed).
* ``query()`` / ``execute()`` – tiny wrappers that ONLY accept parameterized SQL.
* ``fold()``        – Turkish-aware "lower-case + remove accents" used for search.

SECURITY: every SQL statement in this project uses ``?`` placeholders. User input is passed
as a separate ``params`` tuple and the sqlite3 driver sends it as *data*, never as SQL code.
That is the single most important defence against SQL injection (OWASP A03).

    BAD : f"SELECT * FROM users WHERE name = '{name}'"     # attacker controls the SQL
    GOOD: ("SELECT * FROM users WHERE name = ?", (name,))   # attacker controls only a value
"""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any, Iterable

from flask import Flask, current_app, g
from werkzeug.security import generate_password_hash

# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------
# Prices are stored as INTEGER kuruş (1 TL = 100 kuruş). Never use floats for money:
# 0.1 + 0.2 != 0.3 in floating point, but 10 + 20 == 30 in integers.
SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email         TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    full_name     TEXT NOT NULL DEFAULT '',
    city          TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name_tr     TEXT NOT NULL,
    name_en     TEXT NOT NULL,
    desc_tr     TEXT NOT NULL,
    desc_en     TEXT NOT NULL,
    category    TEXT NOT NULL,
    price       INTEGER NOT NULL CHECK (price >= 0),  -- kuruş
    old_price   INTEGER,                              -- kuruş, NULL = no discount
    emoji       TEXT NOT NULL,
    art         INTEGER NOT NULL DEFAULT 1,           -- gradient style 1..8 (CSS class .art-N)
    stock       INTEGER NOT NULL DEFAULT 10,
    featured    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reviews (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body        TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total       INTEGER NOT NULL,                     -- kuruş
    status      TEXT NOT NULL DEFAULT 'paid',
    ship_name   TEXT NOT NULL,
    ship_address TEXT NOT NULL,
    ship_city   TEXT NOT NULL,
    card_last4  TEXT NOT NULL,                        -- we never store a full card number
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id),
    qty         INTEGER NOT NULL CHECK (qty > 0),
    unit_price  INTEGER NOT NULL
);
"""

# ---------------------------------------------------------------------------
# Seed data (the same on every start/reset so tests are repeatable)
# ---------------------------------------------------------------------------
SEED_USERS: list[dict[str, str]] = [
    # username, password, role — part of the test contract in SPEC.md
    {"username": "admin", "password": "admin123", "role": "admin",
     "email": "admin@secureshop.local", "full_name": "Site Yöneticisi", "city": "İstanbul"},
    {"username": "selcuk", "password": "Selcuk!2026", "role": "user",
     "email": "selcuk@secureshop.local", "full_name": "Selçuk Genç", "city": "Ankara"},
    {"username": "ayse", "password": "ayse2026", "role": "user",
     "email": "ayse@secureshop.local", "full_name": "Ayşe Yılmaz", "city": "İzmir"},
]

# (name_tr, name_en, desc_tr, desc_en, category, price_kurus, old_price, emoji, art, stock, featured)
SEED_PRODUCTS: list[tuple[Any, ...]] = [
    ("Antep Fıstıklı Baklava", "Pistachio Baklava",
     "Gaziantep usulü, 40 kat incecik yufka ve bol boz fıstıkla hazırlanmış 1 kg baklava.",
     "Gaziantep-style baklava: 40 paper-thin layers and plenty of green pistachio, 1 kg box.",
     "sweets", 89000, 99000, "🥮", 1, 25, 1),
    ("Türk Kahvesi 250 g", "Turkish Coffee 250 g",
     "Taze çekilmiş, orta kavrulmuş Türk kahvesi. Bol köpüklü bir fincan için ideal.",
     "Freshly ground, medium-roast Turkish coffee for a cup with plenty of foam.",
     "coffee", 18500, None, "☕", 2, 60, 1),
    ("Gül Lokumu", "Rose Turkish Delight",
     "Isparta gülü aromalı, hindistan cevizi kaplı geleneksel lokum, 500 g.",
     "Traditional Turkish delight with Isparta rose and coconut coating, 500 g.",
     "sweets", 24900, None, "🍬", 3, 40, 1),
    ("Rize Çayı 1 kg", "Rize Black Tea 1 kg",
     "Karadeniz'in yamaçlarından, ilk hasat tomurcuk çay. Demlik dostu.",
     "First-harvest black tea from the Black Sea slopes. Made for the double teapot.",
     "tea", 21000, 24000, "🍵", 4, 80, 1),
    ("Bakır Cezve", "Copper Coffee Pot (Cezve)",
     "Gaziantep bakır ustalarının elinden, kalaylı, ahşap saplı cezve.",
     "Hand-hammered, tin-lined copper cezve with a wooden handle, made in Gaziantep.",
     "kitchen", 42000, None, "🫖", 5, 15, 0),
    ("İznik Çini Kase", "Iznik Tile Bowl",
     "Lale ve karanfil motifli, el boyaması 18 cm İznik çini kase.",
     "Hand-painted 18 cm Iznik ceramic bowl with tulip and carnation motifs.",
     "home", 65000, None, "🏺", 6, 8, 1),
    ("Nazar Boncuğu Duvar Süsü", "Evil Eye Wall Ornament",
     "Kapadokya cam ustalarından, kötü bakışlara karşı el yapımı nazar boncuğu.",
     "Handmade glass evil-eye ornament from Cappadocian glass artisans.",
     "home", 12900, None, "🧿", 7, 120, 0),
    ("Kilim Desenli Yastık", "Kilim Pattern Cushion",
     "Anadolu kilim motifleriyle dokunmuş, 45x45 cm pamuklu yastık kılıfı.",
     "Woven 45x45 cm cotton cushion cover with Anatolian kilim motifs.",
     "home", 34900, 41900, "🧶", 8, 20, 1),
    ("Hamam Peştamalı", "Turkish Hammam Towel",
     "Denizli'de dokunmuş, %100 pamuk, hafif ve hızlı kuruyan peştamal.",
     "100% cotton peshtemal woven in Denizli — light and quick-drying.",
     "home", 27500, None, "🛁", 1, 35, 0),
    ("Ege Zeytinyağı 1 L", "Aegean Olive Oil 1 L",
     "Ayvalık'tan soğuk sıkım, natürel sızma zeytinyağı. Hasat: 2026.",
     "Cold-pressed extra virgin olive oil from Ayvalık. Harvest: 2026.",
     "kitchen", 39500, None, "🫒", 2, 50, 1),
    ("Lale Desenli Fincan Seti", "Tulip Coffee Cup Set",
     "6 kişilik porselen Türk kahvesi fincan takımı, altın yaldızlı lale deseni.",
     "Porcelain Turkish coffee cups for six with a gilded tulip pattern.",
     "coffee", 74900, 84900, "🌷", 3, 12, 1),
    ("Kayısı Kurusu 500 g", "Dried Apricots 500 g",
     "Malatya'nın güneşte kurutulmuş, katkısız gün kurusu kayısısı.",
     "Sun-dried, additive-free apricots from Malatya.",
     "sweets", 16900, None, "🍑", 4, 0, 0),  # stock 0 → shows "out of stock"
]

# (product_id, user_id, rating, body)
SEED_REVIEWS: list[tuple[int, int, int, str]] = [
    (1, 2, 5, "Tam Antep'teki gibi! Fıstığı bol, şerbeti tam kıvamında."),
    (1, 3, 4, "Çok lezzetli, kargo da hızlıydı. Biraz daha az şerbetli olabilirdi."),
    (2, 3, 5, "Köpüğü harika, kokusu mutfağı sardı. ☕"),
    (2, 2, 4, "Great taste, I'll order again."),
    (3, 2, 5, "Gül aroması çok doğal, misafirlere ikram ettim, bayıldılar."),
    (4, 3, 5, "Demi çok güzel, rengi tavşan kanı."),
    (6, 2, 5, "Motifler el yapımı olduğu belli, çok kaliteli."),
    (10, 3, 4, "Meyvemsi ve hafif acı, salatalara çok yakıştı."),
    (11, 2, 3, "Fincanlar güzel ama biri biraz çizik geldi."),
]

# (user_id, ship_name, address, city, card_last4, [(product_id, qty)])
SEED_ORDERS: list[tuple[int, str, str, str, str, list[tuple[int, int]]]] = [
    (2, "Selçuk Genç", "Kızılay Mah. Atatürk Blv. No:10", "Ankara", "4242", [(1, 1), (2, 2)]),
    (3, "Ayşe Yılmaz", "Alsancak Mah. Kıbrıs Şehitleri Cd. No:5", "İzmir", "4242", [(6, 1)]),
    (2, "Selçuk Genç", "Kızılay Mah. Atatürk Blv. No:10", "Ankara", "4242", [(4, 1), (3, 1)]),
]


# ---------------------------------------------------------------------------
# Turkish-aware search folding
# ---------------------------------------------------------------------------
_TR_FOLD = str.maketrans({
    "İ": "i", "I": "i", "ı": "i",
    "Ç": "c", "ç": "c", "Ğ": "g", "ğ": "g",
    "Ö": "o", "ö": "o", "Ş": "s", "ş": "s", "Ü": "u", "ü": "u",
})


def fold(text: str | None) -> str:
    """Lower-case ``text`` and strip Turkish accents, so "ÇAY", "çay" and "cay" all match.

    SQLite's built-in ``LIKE`` only ignores case for ASCII letters, so we register this
    Python function inside SQLite (see ``get_db``) and call it from SQL as ``fold(name_tr)``.
    """
    if text is None:
        return ""
    return text.translate(_TR_FOLD).lower()


def like_pattern(term: str) -> str:
    """Build a safe ``LIKE`` pattern: ``%term%`` with ``%`` and ``_`` escaped.

    SECURITY: even with placeholders, ``%`` and ``_`` are *wildcards* inside LIKE. Escaping them
    means a search for "100%" finds the text "100%" instead of matching everything.
    The SQL must use ``ESCAPE '\\'`` for this to work.
    """
    escaped = fold(term).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


# ---------------------------------------------------------------------------
# Connection handling
# ---------------------------------------------------------------------------
def _db_path(app: Flask) -> Path:
    """Where the SQLite file lives (inside Flask's instance folder by default)."""
    return Path(app.config["DATABASE"])


def connect(path: Path) -> sqlite3.Connection:
    """Open a connection with sensible defaults (dict-like rows, foreign keys on)."""
    conn = sqlite3.connect(path, detect_types=sqlite3.PARSE_DECLTYPES)
    conn.row_factory = sqlite3.Row  # rows behave like dicts: row["name"]
    conn.execute("PRAGMA foreign_keys = ON")
    conn.create_function("fold", 1, fold, deterministic=True)
    return conn


def get_db() -> sqlite3.Connection:
    """Return the connection for the current request, opening it on first use."""
    if "db" not in g:
        g.db = connect(_db_path(current_app))
    return g.db


def close_db(_exc: BaseException | None = None) -> None:
    """Close the request's connection (registered with ``app.teardown_appcontext``)."""
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


def query(sql: str, params: Iterable[Any] = (), one: bool = False) -> Any:
    """Run a SELECT with placeholders and return a list of rows (or one row / None).

    >>> query("SELECT * FROM products WHERE id = ?", (3,), one=True)
    """
    cur = get_db().execute(sql, tuple(params))
    rows = cur.fetchall()
    cur.close()
    if one:
        return rows[0] if rows else None
    return rows


def execute(sql: str, params: Iterable[Any] = ()) -> int:
    """Run an INSERT/UPDATE/DELETE with placeholders, commit, and return ``lastrowid``."""
    conn = get_db()
    cur = conn.execute(sql, tuple(params))
    conn.commit()
    return int(cur.lastrowid or 0)


# ---------------------------------------------------------------------------
# Create + seed
# ---------------------------------------------------------------------------
def _seed(conn: sqlite3.Connection) -> None:
    """Insert the demo users, products, reviews and orders."""
    for u in SEED_USERS:
        # SECURITY: we store a salted, slow hash (scrypt via werkzeug), never the password.
        conn.execute(
            "INSERT INTO users (username, email, password_hash, role, full_name, city) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (u["username"], u["email"], generate_password_hash(u["password"]),
             u["role"], u["full_name"], u["city"]),
        )
    conn.executemany(
        "INSERT INTO products (name_tr, name_en, desc_tr, desc_en, category, price, old_price, "
        "emoji, art, stock, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        SEED_PRODUCTS,
    )
    for i, (pid, uid, rating, body) in enumerate(SEED_REVIEWS):
        conn.execute(
            "INSERT INTO reviews (product_id, user_id, rating, body, created_at) "
            "VALUES (?, ?, ?, ?, datetime('now', ?))",
            (pid, uid, rating, body, f"-{len(SEED_REVIEWS) - i} days"),
        )
    for i, (uid, name, addr, city, last4, items) in enumerate(SEED_ORDERS):
        total = 0
        for pid, qty in items:
            price = conn.execute("SELECT price FROM products WHERE id = ?", (pid,)).fetchone()[0]
            total += price * qty
        cur = conn.execute(
            "INSERT INTO orders (user_id, total, ship_name, ship_address, ship_city, card_last4, "
            "created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))",
            (uid, total, name, addr, city, last4, f"-{(len(SEED_ORDERS) - i) * 3} days"),
        )
        for pid, qty in items:
            price = conn.execute("SELECT price FROM products WHERE id = ?", (pid,)).fetchone()[0]
            conn.execute(
                "INSERT INTO order_items (order_id, product_id, qty, unit_price) VALUES (?, ?, ?, ?)",
                (cur.lastrowid, pid, qty, price),
            )


def init_db(app: Flask, reset: bool = False) -> None:
    """Create the database file + tables, and seed it when empty (or when ``reset=True``)."""
    path = _db_path(app)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = connect(path)
    # Wait for another worker's write lock instead of failing immediately.
    conn.execute("PRAGMA busy_timeout = 10000")
    try:
        if reset:
            conn.executescript(
                "DROP TABLE IF EXISTS order_items; DROP TABLE IF EXISTS orders;"
                "DROP TABLE IF EXISTS reviews; DROP TABLE IF EXISTS products;"
                "DROP TABLE IF EXISTS users;"
            )
        conn.executescript(SCHEMA)  # CREATE TABLE IF NOT EXISTS: safe to run concurrently.
        # Seeding must be race-safe: with several gunicorn workers booting against one SQLite
        # file, only ONE may seed a fresh DB. BEGIN IMMEDIATE takes the write lock up front, so
        # a second worker blocks here until the first commits, then sees users already exist and
        # skips. (TR: Birden çok worker aynı anda açılırken yalnızca biri seed etmeli.)
        conn.isolation_level = None  # drive the transaction by hand
        conn.execute("BEGIN IMMEDIATE")
        try:
            empty = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0
            if empty:
                _seed(conn)
            conn.execute("COMMIT")
        except Exception:
            conn.execute("ROLLBACK")
            raise
    finally:
        conn.close()


def init_app(app: Flask) -> None:
    """Hook the database into the Flask app (called from ``create_app``)."""
    app.teardown_appcontext(close_db)
    init_db(app)
