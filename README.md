# Food Map Aggregator

A Next.js App Router and TypeScript food discovery prototype. Its safe default is a deterministic, clearly labeled demo; live data is isolated behind a server-side provider boundary.

## Runtime and quick start

Use Node.js 22.12 or newer in the Node 22 line and npm 10 or newer. Node 20.19+ also satisfies the current toolchain, but Node 22 is the deployment target.

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Demo mode needs no account, credential, or external service.

## Architecture

- `src/app/` contains App Router pages and `GET /api/places`.
- `src/features/places/components/` contains the accessible explorer and persisted filter controls.
- `src/features/places/data/` contains deterministic provider fixtures used only in demo mode.
- `src/features/places/model/` defines place/provider contracts and validates local preferences.
- `src/features/places/server/` selects providers, normalizes results, and aggregates them behind one boundary.
- `src/test/` configures Vitest; `e2e/` contains deterministic Playwright journeys.

The browser never receives provider credentials. `GET /api/places` accepts `source`, `lat`, `lng`, `radius` (maximum 3000m), `limit` (maximum 25), `category`, `minRating`, and `maxPrice`. The server queries adapters and returns normalized places plus explicit aggregate and per-provider statuses.

## Source modes

| Mode | Data source | Credentials | External network | Intended use |
| --- | --- | --- | --- | --- |
| `demo` (default) | Bundled Amap, Meituan, Ele.me, and Douyin-shaped fixtures | None | None | Development, review, automated tests |
| `live` | Official Amap Web Service API | `AMAP_WEB_SERVICE_KEY` | Server to Amap | Authorized integration testing or production |

Responses always include `sourceMode`; provider statuses include their mode. Live mode never falls back to fixtures: without a valid key it returns an unavailable Amap status and no places.

## Environment variables

Copy `.env.example` to `.env.local`. Do not commit local environment files.

| Variable | Scope | Required | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_DEFAULT_SOURCE_MODE` | Browser-visible | No | Documents the desired default (`demo`); the current page deliberately renders demo mode. |
| `AMAP_WEB_SERVICE_KEY` | Server-only | Live mode only | Credential for the official Amap Web Service. Never rename it with a `NEXT_PUBLIC_` prefix. |

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Check TypeScript without emitting files |
| `npm test` | Run deterministic Vitest unit/component tests |
| `npx playwright install chromium` | Install the E2E browser once on a workstation/CI image |
| `npm run test:e2e` | Run non-map Chromium journeys with mocked geolocation and blocked external traffic |
| `npm run build` | Create the production build |
| `npm start` | Serve an existing production build |

## Deploying to Vercel

1. Import the repository into Vercel and select the Next.js framework preset.
2. Leave the root directory at the repository root and the build command as `npm run build`.
3. Select Node.js 22.x in Project Settings.
4. Keep demo mode for preview deployments. For authorized live deployments, add `AMAP_WEB_SERVICE_KEY` as a sensitive server environment variable for the required environments.
5. Deploy, then verify the source label and `/api/places?source=demo`. Verify live mode separately only when the provider agreement and key permit it.

No deployment command or Vercel token is required for local development.

## Legal and operational limits

This repository does not grant rights to scrape, cache, republish, or commercially use provider data, names, trademarks, reviews, images, or rankings. Fixtures are synthetic and must remain labeled `demo`. Before enabling live mode, obtain the provider account and permissions required by its terms, respect attribution, rate, retention, and deletion rules, and review applicable map licensing and coordinate-system rules for every served region.

Browser location is optional, session-only, and requires user consent; denial leaves the manual demo location active. Do not log precise coordinates or combine them with personal data without an appropriate privacy notice and lawful basis. Provider keys must stay server-side, be restricted at the provider, and be rotated if exposed.
