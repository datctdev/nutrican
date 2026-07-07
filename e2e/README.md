# NutriCan E2E (Playwright)

## Prerequisites

1. **Backend** running on `http://localhost:8080` (seed users loaded)
2. **Node 20+** — `npm install` in this folder
3. **Browsers** — `npx playwright install chromium`

## Run

```bash
# From repo root — BE must be up first
cd e2e
npm install
npx playwright install chromium
npm run test:e2e
```

Playwright auto-starts `nutrican-fe` dev server unless `E2E_SKIP_WEBSERVER=1`.  
`global-setup.ts` waits for BE seed login before any spec runs.

## Layers (Addendum v3.1)

```bash
npm run test:be      # API-only (-g "BE-only")
npm run test:fe      # UI-only (-g "FE-only")
npm run test:hybrid  # API + UI (-g "Hybrid")
```

## Env

| Variable | Default |
|----------|---------|
| `E2E_API_URL` | `http://localhost:8080/api/v1` |
| `E2E_BASE_URL` | `http://localhost:5173` |
| `E2E_SKIP_WEBSERVER` | unset = start Vite |

## Seed logins

See [`docs/TEAM_ONBOARDING.md`](../docs/TEAM_ONBOARDING.md).
