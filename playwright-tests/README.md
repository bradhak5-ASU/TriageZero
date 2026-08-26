# NovaCart Playwright Baseline

This folder contains the green Playwright baseline for the NovaCart storefront.

The baseline intentionally avoids QA Sentinel, Gemini, Google ADK, GitHub issue creation, and controlled defects. It only verifies the current NovaCart user journeys.

## Covered Flows

- Catalog loads
- Search by product name
- Product detail opens
- Add to cart
- Update quantity
- Remove from cart
- Successful checkout
- Confirmation page

## Run

```bash
docker compose up --build
docker compose exec backend python -m scripts.seed
cd playwright-tests
npm install
npx playwright install
npm test
```

Optional environment variables:

```bash
NOVACART_BASE_URL=http://localhost:5173
TRIAGEZERO_API_URL=http://localhost:8001
```

## Clean NovaCart

```bash
docker compose up --build -d
docker compose exec backend python -m scripts.seed
cd playwright-tests
npm test
```

## TriageZero-AI Local API

Start the separate TriageZero-AI app locally so it listens at:

```text
http://localhost:8001
```

The Playwright uploader posts to:

```text
POST ${TRIAGEZERO_API_URL}/api/v1/investigations
```

## checkout_500 With Automatic Submission

```bash
NOVACART_DEFECT_SCENARIO=checkout_500 docker compose up --build -d
docker compose exec backend python -m scripts.seed
cd playwright-tests
TRIAGEZERO_API_URL=http://localhost:8001 npm test -- --grep "successful checkout shows confirmation page"
```

On failure, Playwright keeps the local screenshot, trace, evidence JSON, and package JSON. If `TRIAGEZERO_API_URL` is set, it also submits the generated `failure-package.json` to TriageZero-AI. Upload failures are logged but do not replace the original Playwright failure.

## Manual Package Submission

```bash
cd playwright-tests
TRIAGEZERO_API_URL=http://localhost:8001 npm run submit:package -- test-results/<run-folder>/failure-package.json
```
