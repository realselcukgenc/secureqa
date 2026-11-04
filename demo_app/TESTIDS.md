# SecureShop — element ids & `data-testid` reference

Stable selectors for UI tests. **Spec ids** (from SPEC.md, the contract) are marked ★.
Prefer `[data-testid="..."]` for new tests; ids marked ★ never change.

## Every page (`base.html`)
| Selector | What |
|---|---|
| `html[lang]` | `tr` or `en` (current language) |
| `body[data-testid="page-<name>"]` | page name: home, products, product, login, register, account, order, cart, checkout, admin, error |
| `[data-testid=demo-banner]` | "demo store" bar |
| `[data-testid=site-header]`, `[data-testid=main-nav]`, `[data-testid=site-footer]` | layout |
| `[data-testid=nav-home]`, `nav-link-home`, `nav-products`, `nav-admin` (admins only) | nav links |
| `[data-testid=header-search-input]` (`#header-q`, name `q`) | header search |
| `#lang-tr` / `#lang-en` · `[data-testid=lang-tr]`, `lang-en`, `lang-switcher` | language switch (`?lang=`) |
| `#theme-toggle` · `[data-testid=theme-toggle]` | dark/light (sets `html[data-theme]`, saved in localStorage) |
| `[data-testid=nav-cart]`, `#cart-count` · `[data-testid=cart-count]` | cart link + badge (class `is-empty` when 0) |
| `[data-testid=nav-login]` / `nav-account`, `nav-username`, `nav-logout` (`a[href='/logout']`) | auth state (desktop) |
| `#menu-toggle`, `nav-*-mobile` | mobile menu (< 760 px) |
| `#toast-stack`, `[data-testid=toast][data-toast-type=success|error|info]` | toast notifications (auto-hide after 4.5 s) |

## Products & search (`/`, `/products`)
| Selector | What |
|---|---|
| `[data-testid=hero]`, `hero-title`, `hero-shop-btn`, `featured-grid` (`#featured-products`), `category-<key>`, `security-section` | home |
| `[data-testid=product-card][data-product-id]` | product card (also on home/related) |
| `[data-testid=product-name]`, `product-link`, `product-price`, `rating[data-rating]`, `sale-badge`, `product-art` | inside a card |
| `[data-testid=add-to-cart][data-product-id]` | "+" button (POSTs via fetch, shows toast, updates `#cart-count`) |
| `#q` · `[data-testid=search-input]` (name `q`), `#search-btn`, `#sort` · `sort-select` | search form |
| ★ `#search-term` · `[data-testid=search-term]` | escaped search term (only when `q` given) |
| `[data-testid=search-results-line]`, `product-grid` (`#product-list`), `no-results` | results |
| `[data-testid=filter-all]`, `filter-<key>` | category chips: sweets, coffee, tea, kitchen, home |

## Product detail (`/product/<id>`)
| Selector | What |
|---|---|
| `#product-name` · `[data-testid=product-name]` (first match), `#product-price`, `product-description`, `product-stock` | info |
| `#qty` · `qty-input`, `#add-to-cart-btn` · `add-to-cart-btn`, `add-to-cart-form` | buy box |
| `#reviews`, `[data-testid=review][data-review-id]`, `review-author` | reviews |
| ★ `.review-body` · `[data-testid=review-body]` | review text (escaped) |
| `#review-form` (`form[action*='/review']`), `[name=body]` · `review-body-input`, `rating-1..5` (radio `name=rating`), `#review-btn` · `review-submit`, `#review-error` | review form (logged in) |
| `[data-testid=review-login-hint]` | shown to guests instead of the form |

## Auth
| Selector | What |
|---|---|
| ★ `#username`, ★ `#password`, ★ `#login-btn`, ★ `#login-error` | login (generic error; HTTP 429 + message after 5 failures/min) |
| `[data-testid=demo-fill-admin|selcuk|ayse]` | fill the form with a demo account |
| ★ `#username`, `#email` (optional), ★ `#password`, ★ `#register-btn`, ★ `#register-error` | register (errors listed) |
| `[data-testid=password-meter]`, `password-rules` | live hints (server enforces policy) |

## Account & orders
| Selector | What |
|---|---|
| ★ `#account-username`, ★ `#account-email`, `#account-role` | profile |
| `#email-form` (`form[action$='/account/email']`), `#new-email` (name `email`) · `email-input`, `#email-btn`, `#email-error` | change e-mail |
| `#orders-table`, `[data-testid=order-row][data-order-id]`, `order-link` | order list |
| `#order-detail[data-order-id]`, `order-number`, `order-status`, `order-total`, `order-item` | `/orders/<id>` |
| ★ `#order-confirmation` | shown once, right after checkout |

## Cart & checkout
| Selector | What |
|---|---|
| `#cart`, `[data-testid=cart-item][data-product-id]`, `cart-item-name`, `cart-qty`, `cart-remove`, `cart-line-total`, `#cart-total`, `#go-checkout`, `#cart-empty` | `/cart` |
| `#checkout-form`, `#ship_name`, `#ship_address`, `#ship_city`, `#ship_phone`, `#card_number`, `#card_exp`, `#card_cvc` (test ids `ship-*`, `card-*`) | `/checkout` (card prefilled with 4242 4242 4242 4242, 12/30, 123) |
| ★ `#checkout-btn` · `[data-testid=checkout-submit]`, `#checkout-error`, `checkout-total`, `demo-payment-note` | submit / errors |

## Admin (`/admin`)
| Selector | What |
|---|---|
| ★ `#admin-panel` | dashboard root (admins only; 403 page for users) |
| `[data-testid=stat-revenue|stat-orders|stat-users|stat-products]`, `chart-revenue`, `low-stock`, `admin-orders` (`#admin-orders-table`), `admin-users` (`#admin-users-table`), `admin-order-row`, `admin-user-row` | widgets |

## Error pages
`[data-testid=error-page][data-status]`, `#error-code`, `error-title`, `error-message` — friendly pages for 400 (incl. CSRF), 403, 404, 405, 413, 429, 500. JSON `{"error", "status"}` under `/api/`.
