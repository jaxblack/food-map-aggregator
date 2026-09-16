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

`GET /api/places` returns the default, clearly labeled demo aggregation from deterministic Amap, Meituan, Eleme, and Douyin fixtures. Use `?source=live` for the official Amap Web Service. Optional query parameters are `lat`, `lng`, `radius` (capped at 3000m), `limit` (capped at 25), `category`, `minRating`, and `maxPrice`.

## Environment

Copy `.env.example` for local development. Set the server-only `AMAP_WEB_SERVICE_KEY` to enable live mode. Without it, live mode reports Amap as unavailable and returns no fixtures; choose `source=demo` explicitly for deterministic data. Never commit `.env` files or expose provider credentials through `NEXT_PUBLIC_*` variables.
