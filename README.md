# Spanish Paternity Leave Planner

An interactive SPA that calculates and visualises Spanish paternity/maternity leave schedules,
including mandatory leave, flexible leave, and accumulated lactancia (nursing) leave under
current Spanish law.

## Spanish Law Background

Each parent is entitled to:

- **Mandatory leave** — 6 weeks immediately after birth (non-transferable, begins on birth date)
- **Flexible leave** — 11 weeks to be taken before the child turns 12 months
- **Accumulated lactancia** — up to 15 working days, accrued at 1 hour per working day until the
  baby turns 9 months, taken consecutively as full days

## Features

- One or two-parent simulation
- Two scheduling strategies: **Together** (simultaneous) and **Optimized** (staggered for maximum
  home coverage)
- Interactive multi-month calendar with hover tooltips
- In-place editing of leave durations per period, with cascading recalculation
- Persistent state via `localStorage`

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20 (use `.nvmrc`: `nvm use`) |
| npm | ≥ 10 |
| Docker + Compose | any recent version (optional, for containerised dev) |

## Local Development

### Without Docker

```bash
make install   # installs npm dependencies
make dev       # starts Vite dev server → http://localhost:5173
```

### With Docker (recommended)

```bash
make docker-dev   # builds image and starts dev server with hot-reload
```

Then open <http://localhost:5173>.

## Available Make Targets

| Target | Description |
|--------|-------------|
| `make install` | Install npm dependencies (`npm ci`) |
| `make dev` | Start Vite dev server |
| `make build` | Production build to `dist/` |
| `make preview` | Preview production build locally |
| `make typecheck` | Run TypeScript type checker |
| `make lint` | Run ESLint |
| `make format` | Run Prettier |
| `make test` | Run Vitest in watch mode |
| `make test-run` | Run Vitest once (CI mode) |
| `make clean` | Remove `node_modules/` and `dist/` |
| `make docker-dev` | Start dev server in Docker with hot-reload |
| `make docker-build` | Build the production Docker image |
| `make docker-down` | Stop and remove Docker containers |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Language | TypeScript 5 (strict mode) |
| Bundler | Vite 6 |
| Linting | ESLint + `typescript-eslint` |
| Formatting | Prettier |
| Testing | Vitest + Testing Library |
| Styling | Plain CSS |
| CI/CD | GitHub Actions → GitHub Pages |

## Deploy

The project deploys automatically to GitHub Pages on every push to `main`
via `.github/workflows/deploy.yml`.

Manual build:

```bash
make build
# output in dist/
```
