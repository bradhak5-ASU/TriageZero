# TriageZero / NovaCart Project Checkpoint

**Checkpoint date:** August 25, 2026
**Repository:** https://github.com/bradhak5-ASU/TriageZero
**Current branch:** `main`

## 1. Project Purpose

TriageZero is an autonomous regression-test failure investigation platform being developed for the Google All Things Agentic Hackathon.

The project contains two conceptually separate applications:

1. **NovaCart** — a realistic e-commerce application that Playwright will test.
2. **TriageZero** — the future AI release-engineering system that will investigate Playwright failures.

The current working application is **NovaCart**. TriageZero AI, Gemini, Google ADK, Pub/Sub, Firestore, and Cloud Run are not part of the current implementation milestone.

## 2. Current Architecture

```text
React/Vite frontend
        |
        v
FastAPI backend
        |
        v
SQLAlchemy + PostgreSQL
```

The complete future flow is expected to become:

```text
NovaCart
   |
   v
Playwright regression suite
   |
   v
Failure artifacts
   |
   v
TriageZero investigation API
   |
   v
Gemini + Google ADK
   |
   v
Classification, evidence, root cause, and engineering action
```

## 3. Work Completed

### Docker and configuration

- Docker Compose configuration for PostgreSQL, FastAPI, and React/Vite.
- Backend waits for the PostgreSQL health check.
- Centralized environment configuration through `.env`.
- Safe `.env.example` template.
- `.env` and credentials are ignored by Git.
- Backend CORS configuration for the frontend origin.
- Separate frontend and backend Dockerfiles.

### NovaCart backend

- FastAPI application and `/api/v1` API structure.
- SQLAlchemy product, order, and order-item models.
- Pydantic request and response schemas.
- PostgreSQL table initialization.
- Idempotent product seed script.
- 24 database-backed products across 9 categories.
- Local image paths stored with product records.
- Product search, category filtering, featured filtering, and sorting.
- Product-detail endpoint.
- Order creation with server-calculated totals.
- Stock validation and stock reduction after a successful order.
- Order retrieval endpoint.
- Health endpoint.

Available endpoints:

```text
GET  /api/v1/health
GET  /api/v1/categories
GET  /api/v1/products
GET  /api/v1/products/{id}
POST /api/v1/orders
GET  /api/v1/orders/{id}
```

### NovaCart frontend

- Responsive storefront home page.
- Compact hero section and backend-status indicator.
- Featured-product section.
- Category browsing.
- Search, filter, and sorting controls.
- Responsive product grid.
- Product cards with image, brand, description, rating, price, stock, and actions.
- Product-detail view with specifications and quantity selection.
- Shopping cart with quantity updates, removal, subtotals, and total.
- Demo checkout form.
- Order summary.
- Order-confirmation view.
- Local SVG product assets.
- Stable `data-testid` attributes on important test targets.

## 4. Validation Completed

The complete Docker stack was built and launched successfully.

The following checks passed:

- PostgreSQL container is healthy.
- FastAPI starts successfully.
- Vite frontend starts successfully.
- Backend Python files compile.
- Frontend production build completes.
- Seed script can run twice without duplicating products.
- Database contains 24 products and 9 categories.
- Health endpoint returns `{"status":"ok"}`.
- Search, category filtering, featured filtering, and sorting work.
- Missing products return HTTP 404.
- Empty carts and excessive quantities are rejected.
- All nine local product-image assets return HTTP 200.
- Desktop storefront renders all 24 catalog products.
- Mobile storefront renders without horizontal overflow.
- Product details and specifications render.
- Cart quantities and totals are correct.
- Checkout creates a persisted order.
- Order confirmation matches the backend-calculated total.
- Successful checkout reduces product stock.
- No frontend runtime exceptions or failed application requests were detected during the full purchase flow.

## 5. Important Current Limitations

### Fresh installations require manual seeding

`docker compose up` creates the tables but does not automatically run the seed script. A new developer must run:

```bash
docker compose exec backend python -m scripts.seed
```

Until that command runs, a fresh database will have an empty product catalog.

### Controlled defects are not implemented yet

The current code is the working baseline. It does **not** contain planted or switchable defects.

These planned scenarios do not exist yet:

- Checkout HTTP 500.
- Incorrect cart or order total.
- Broken Playwright locator.
- Delayed notification or confirmation.
- Product API failure.
- Incorrect stock behavior.
- Environment or dependency failure.

### Planned architecture is not fully separated yet

- The frontend currently uses component state instead of React Router and Context API.
- The backend routes currently access SQLAlchemy directly instead of using separate service and repository layers.
- Database migrations are not yet established even though Alembic is included as a dependency.
- Automated backend and frontend tests do not exist yet.
- A missing favicon produces one harmless browser-console 404.

These items do not prevent baseline test development, but the team should track them explicitly.

## 6. Run the Project on a New Device

### Prerequisites

- Git
- Docker Desktop
- Access to the GitHub repository

### Clone and start

```bash
git clone https://github.com/bradhak5-ASU/TriageZero.git
cd TriageZero

cp .env.example .env

docker compose up --build -d
docker compose ps

docker compose exec backend python -m scripts.seed
```

Open:

- NovaCart: http://localhost:5173
- Backend: http://localhost:8000
- FastAPI documentation: http://localhost:8000/docs

Verify the backend:

```bash
curl http://localhost:8000/api/v1/health
```

Expected response:

```json
{"status":"ok"}
```

View logs:

```bash
docker compose logs -f
```

Stop the stack without deleting the database:

```bash
docker compose down
```

Start it again:

```bash
docker compose up -d
```

## 7. Git Workflow for the Test-Automation Teammate

Create a separate branch from the latest `main`:

```bash
git switch main
git pull --ff-only origin main
git switch -c playwright-regression-tests
```

Commit and publish test work:

```bash
git status
git add .
git commit -m "Add NovaCart Playwright regression tests"
git push -u origin playwright-regression-tests
```

Bring later `main` changes into the test branch:

```bash
git switch main
git pull --ff-only origin main

git switch playwright-regression-tests
git merge main
git push
```

Never commit `.env`, credentials, API keys, database passwords, tokens, or Google Cloud service-account files.

## 8. Next Milestone: Baseline Test Automation

The next milestone is a reliable Playwright regression suite against the working NovaCart baseline.

### Step 1 — Establish Playwright

- Add Playwright in a clearly separated test directory.
- Add configuration for local and Docker-based execution.
- Read the frontend base URL from an environment variable.
- Do not hardcode ports or environment-specific hostnames throughout the tests.
- Add reusable fixtures and test-data helpers.
- Define artifact directories for screenshots, traces, videos, and reports.

Suggested structure:

```text
tests/
  playwright.config.js
  fixtures/
  helpers/
  pages/
  specs/
    home.spec.js
    catalog.spec.js
    product-details.spec.js
    cart.spec.js
    checkout.spec.js
    api.spec.js
```

### Step 2 — Automate the positive baseline

Create stable tests for:

1. Backend and frontend health.
2. Product catalog loading.
3. Search by product name, brand, category, and SKU.
4. Category filtering.
5. Price and rating sorting.
6. Product-detail navigation.
7. Product specifications.
8. Adding products to the cart.
9. Updating quantity.
10. Removing an item.
11. Cart subtotal and total calculations.
12. Checkout validation.
13. Successful order creation.
14. Order-confirmation content.
15. Stock reduction after checkout.
16. Responsive smoke coverage.

Tests should use role-based locators or intentional `data-testid` values. Avoid fragile CSS selectors tied to visual styling.

### Step 3 — Capture useful failure artifacts

Configure Playwright to retain the following when a test fails:

- Test name and project/browser.
- Expected and actual result.
- Screenshot.
- Trace archive.
- Video when useful.
- Browser-console output.
- Failed network requests.
- Relevant API request and response details.
- Git commit SHA.
- Branch name.
- Environment information.

This artifact package will later become the input to TriageZero.

### Step 4 — Add CI automation

After the suite is stable locally, add a GitHub Actions workflow that:

1. Checks out the repository.
2. Creates the test environment configuration.
3. Builds and starts Docker Compose.
4. Waits for PostgreSQL, backend, and frontend health.
5. Seeds the product catalog.
6. Runs Playwright.
7. Uploads the Playwright report and failure artifacts.
8. Shuts down the Docker stack.

The first CI goal is repeatability. Do not introduce intentional failures until the positive suite is consistently green.

## 9. Controlled-Defect Plan

Controlled defects should be implemented only after the baseline suite is stable.

Each defect should be:

- Disabled by default.
- Enabled by a documented environment variable or controlled test mode.
- Deterministic and reproducible.
- Limited to one clear failure mechanism.
- Easy to reset without editing source code.
- Mapped to at least one Playwright test.
- Documented with expected symptoms and evidence.

Suggested switches:

```text
NOVACART_DEFECT_CHECKOUT_500=false
NOVACART_DEFECT_WRONG_TOTAL=false
NOVACART_DEFECT_PRODUCT_API_FAILURE=false
NOVACART_DEFECT_STOCK=false
VITE_DEFECT_BROKEN_CHECKOUT_LOCATOR=false
VITE_DEFECT_SLOW_CONFIRMATION_MS=0
```

Suggested defect catalog:

| Defect | Layer | Expected Playwright symptom | Likely classification |
|---|---|---|---|
| Checkout HTTP 500 | Backend | Order request returns 500 | Application/backend defect |
| Wrong total | Backend or frontend | Expected and displayed totals differ | Business-logic defect |
| Broken locator | Frontend | Checkout control cannot be located | UI contract or test-locator defect |
| Slow confirmation | Frontend/backend | Confirmation exceeds timeout | Performance/timing defect |
| Product API failure | Backend | Catalog request fails | API/service defect |
| Stock bug | Backend | Invalid quantity succeeds or stock becomes incorrect | Data-integrity defect |

Do not enable multiple defects in the same run until every individual scenario is understood and produces consistent evidence.

## 10. Work After Test Automation

Once the baseline suite, failure artifacts, and controlled defects are complete, begin the TriageZero platform milestone:

1. Define a versioned failure-package schema.
2. Create an ingestion API separate from NovaCart.
3. Store investigation runs and evidence.
4. Add previous-failure similarity search.
5. Integrate Gemini and Google ADK.
6. Require structured investigation output.
7. Add classification, confidence, root cause, severity, and release risk.
8. Add an action router.
9. Create GitHub issues only through explicit, auditable rules.
10. Build the engineering dashboard.
11. Add Pub/Sub, Firestore, Cloud Run, and deployment automation only after the local workflow is reliable.

TriageZero must remain separate from NovaCart. NovaCart is the system under test; TriageZero is the system performing the investigation.

## 11. Team Responsibilities

### NovaCart/application owner

- Keep the working baseline stable.
- Review API and data-model changes.
- Maintain seed data and Docker configuration.
- Implement controlled defects after the baseline tests are green.
- Document every defect switch.

### Test-automation owner

- Build and maintain the Playwright suite.
- Keep tests deterministic and independent.
- Use stable locators.
- Validate UI behavior and relevant API responses.
- Capture complete failure artifacts.
- Add CI execution and reports.

### Shared responsibility

- Review pull requests.
- Keep secrets out of Git.
- Keep `main` green.
- Use separate branches for application, test, and infrastructure changes.
- Record important decisions and update this checkpoint as milestones change.

## 12. Immediate Action Checklist

- [ ] Share this checkpoint with the test-automation teammate.
- [ ] Confirm the teammate can clone and run the stack.
- [ ] Run the seed command on the teammate's fresh database.
- [ ] Create the `playwright-regression-tests` branch.
- [ ] Add baseline Playwright configuration.
- [ ] Automate health and catalog smoke tests.
- [ ] Automate cart and successful checkout.
- [ ] Configure screenshots, traces, and reports on failure.
- [ ] Add GitHub Actions after local tests are stable.
- [ ] Review and merge the baseline test suite.
- [ ] Design controlled defect switches.
- [ ] Implement and validate defects one at a time.
- [ ] Define the failure-package contract for future TriageZero ingestion.

## 13. Current Handoff Decision

NovaCart is ready to be shared for **baseline positive-flow Playwright development**.

It is not yet ready for intentional-failure investigation because controlled defects have not been implemented. A teammate cloning the repository must manually run the seed script before the product catalog will appear.
