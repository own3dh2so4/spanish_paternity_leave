# Spanish Parental Leave Planner

Interactive SPA that plans the Spanish *permiso por nacimiento y cuidado de menor* for one or two
parents and shows it on a calendar, together with an estimate of the accumulated *lactancia* leave.

> Planning tool, not legal advice. Confirm dates with your employer and the INSS.

## What the law says (art. 48.4 and 48.6 ET, as amended by RDL 9/2025)

Applies to births from **31 July 2025**. Everything is counted in **natural days**; a week is 7 days.

| | Two parents (each) | Single-parent family |
|---|---|---|
| Mandatory, full-time, starting on the birth date | 6 weeks | 6 weeks |
| Flexible, in whole weeks, until the child turns 12 months | 11 weeks | 22 weeks |
| Paid, in whole weeks, until the child turns 8 | 2 weeks | 4 weeks |
| Multiple birth, per additional child | +1 week | +2 weeks |
| Child with a disability | +1 week | +2 weeks |
| Biological mother may start before the due date | up to 4 flexible weeks | up to 4 flexible weeks |

- The right is individual and cannot be transferred between parents.
- Both parents may take their weeks at the same time or one after the other.
- The employer must be told at least 15 days in advance.
- *Lactancia* (art. 37.4 ET): one hour per working day until the child is 9 months old. Many collective
  agreements let it be accumulated into full days; the app estimates that number and lets you edit it.
- The unpaid *permiso parental* of up to 8 weeks (art. 48 bis ET) is a separate leave. It is available in
  the app as an extra period you can add.

Sources: [Estatuto de los Trabajadores (consolidated)](https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430),
[RDL 9/2025](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-15741),
[INSS – Nacimiento y cuidado de menor](https://www.seg-social.es/wps/portal/wss/internet/Trabajadores/PrestacionesPensionesTrabajadores/6b96a085-4dc0-47af-b2cb-97e00716791e).

### Public employees and collective agreements

Each parent picks an employment regime in the wizard:

| | Private sector (ET) | Public employee (EBEP art. 49) | SERMAS (Madrid health service, 2026 pact) |
|---|---|---|---|
| Weeks of birth leave | 6 + 11 + 2 | 6 + 11 + 2 | 6 + 11 + 2 |
| Weeks before the due date | up to 4 flexible weeks (mother) | not allowed | paid leave from week 37 (35 for multiples), does not use leave weeks |
| Lactancia | until 9 months, estimated from working days | until 12 months, estimated from working days | until 12 months, 30 calendar days per child, right after the leave |
| Extra paid days after the leave | whatever your agreement grants (enter the number) | whatever your administration grants | 10 calendar days for the biological mother |

Sources: [EBEP](https://www.boe.es/buscar/act.php?id=BOE-A-2015-11719),
[SERMAS – Pacto de permisos 2026](https://www.comunidad.madrid/hospital/atencionprimaria/profesionales/pacto-permisos-licencias-medidas-conciliacion-personal-estatutario).

## Features

- Two-parent or single-parent families, multiple births, disability, weeks taken before the birth
- Per-parent employment regime (private sector, public employee, SERMAS) and extra paid days from your agreement
- Two strategies: **Together** (simultaneous) and **Staggered** (one parent is always at home)
- Editable durations and start dates, drag or keyboard reordering, extra periods (holidays, unpaid
  parental leave, custom)
- Warnings when flexible weeks run past the child's first birthday
- Shareable link, Spanish/English, dark/light theme, persistent state in `localStorage`

## Development

| Tool | Version |
|------|---------|
| Node.js | ≥ 20 (`nvm use`) |
| npm | ≥ 10 |

```bash
make install     # npm ci
make dev         # http://localhost:5173
make typecheck   # tsc (app + e2e)
make lint        # eslint (app + e2e)
make test-run    # vitest
make test-e2e    # installs Playwright chromium and runs the e2e suite
make build       # production build to dist/
```

Docker:

```bash
make docker-dev    # dev server with hot reload
make docker-prod   # nginx image serving the production build at /
```

## Tech stack

React 19 · TypeScript 5 (strict) · Vite 6 · Vitest + Testing Library · Playwright · plain CSS.

## Deploy

Every push to `master` runs typecheck, lint and unit tests, then deploys to GitHub Pages
(`.github/workflows/deploy.yml`). Pull requests run the same checks plus the Playwright suite
(`.github/workflows/ci.yml`).

## License

MIT
