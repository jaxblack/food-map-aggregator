# Food Map Aggregator

A stable Next.js App Router and TypeScript foundation for a provider-backed food map. The current vertical slice is intentionally deterministic: a built-in dataset drives an accessible, linked map and restaurant list without external services or secrets.

## Quick start

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The default `demo` source requires no configuration.

## Commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Architecture

- `src/app/` — App Router pages, layout, styles, and Route Handlers
- `src/features/places/components/` — interactive feature UI
- `src/features/places/data/` — deterministic demo fixtures
- `src/features/places/model/` — provider, source mode, and place contracts
- `src/features/places/server/` — source selection and provider boundary
- `src/test/` — shared test setup

`GET /api/places` returns the default demo response. Use `?source=demo` explicitly or `?source=live` to inspect the typed, intentionally unavailable external-provider state. Unknown source values return `400`.

## Environment

Copy `.env.example` for local development. `FOOD_DATA_API_KEY` is a server-only placeholder for a future integration and is not read by this slice. Never commit `.env` files or expose provider credentials through `NEXT_PUBLIC_*` variables.
