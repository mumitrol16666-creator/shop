# Storefront Stage 2 — UX architecture and routes

## Scope

Stage 2 decomposes the public storefront into canonical pages without changing the Stage 1 commerce core or redesigning the established visual language. Checkout, server-side pricing, stock validation, order creation and the `payment_reported` review state remain unchanged.

## Route contract

- `/` — commercial home page with catalog preview only.
- `/catalog` — full catalog with URL-backed search, filters and sorting.
- `/catalog/:category` — catalog constrained by a stable category slug.
- `/product/:slug` — canonical product page using `ProductReadModel` and server-authored pricing.
- `/picker` — five-step non-PII selection assistant using only real in-stock catalog entries.
- `/cart` — full cart view backed by the same persisted cart provider as the drawer.
- Unknown product and category paths return a real HTTP 404.

Canonical category slugs are independent from Russian display labels. Query state uses `q`, `availability`, `sale`, `price` and `sort`, so filtered catalog URLs are shareable and survive refresh.

## Runtime architecture

`StoreRuntime` owns the public shell, cart provider and existing checkout overlays. Route-level page components receive read models; they do not reconstruct price, stock or product identity. The Next/Vinext runtime resolves routes on the server. The VPS entry uses the same route components and only serves the SPA shell for the explicit public route allow-list.

## Navigation behavior

Catalog cards save their current URL, scroll offset and product id in session storage before opening a product. Browser Back restores the exact filtered URL, scroll position and keyboard focus. Overlay dialogs lock background scrolling, trap focus, close on Escape and return focus to the triggering control.

Search waits for two characters, debounces requests by 250 ms, cancels stale requests and supports Arrow Up/Down, Enter and Escape. It returns no more than six live catalog results.

## Rollback

Revert the Stage 2 commit and redeploy the previous exact source commit. No database migration or destructive data change is part of Stage 2, so rollback is code-only.
