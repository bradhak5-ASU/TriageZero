# TriageZero Updated Architecture and Automation Plan

**Updated:** August 25, 2026
**Status:** Approved working plan
**Hackathon:** Google All Things Agentic Hackathon

## 1. Executive Summary

TriageZero is an autonomous regression-test failure investigation platform. It is designed to behave like an AI release engineer rather than a chatbot.

The project will use two separate repositories and two separate deployed applications:

1. **NovaCart** is the sample e-commerce target application. It contains the website, its API, its database integration, Playwright regression tests, controlled defects, and test CI workflow.
2. **TriageZero** is the AI investigation platform. It receives structured failure packages, investigates failures with Gemini and Google ADK, stores evidence and results, displays investigations in an engineering dashboard, and can take controlled engineering actions.

The final workflow will be automatic. A person will not need to upload every Playwright failure through the TriageZero website. GitHub Actions will run Playwright, collect failure artifacts, upload large artifacts to Cloud Storage, and submit a structured failure package to the TriageZero ingestion API.

A manual upload screen may exist as a fallback and hackathon demonstration feature, but it is not the primary production workflow.

## 2. Core Architecture Decision

NovaCart and TriageZero must remain separate.

```text
NovaCart = system under test
TriageZero = system investigating the test failure
```

TriageZero must not be embedded inside NovaCart. NovaCart must not contain Gemini, Google ADK, investigation logic, or the TriageZero dashboard.

## 3. Repository Strategy

### Repository 1: NovaCart target application

Suggested repository name:

```text
novacart-target
```

The current repository may continue to be used, but renaming it from `TriageZero` to `novacart-target` would make the boundary clearer.

Recommended contents:

```text
novacart-target/
├── frontend/
│   ├── src/
│   └── public/
├── backend/
│   ├── app/
│   └── scripts/
├── tests/
│   └── playwright/
│       ├── fixtures/
│       ├── helpers/
│       ├── pages/
│       ├── reporters/
│       └── specs/
├── defect-config/
├── .github/
│   └── workflows/
│       └── regression.yml
├── docker-compose.yml
├── .env.example
└── README.md
```

This repository owns:

- The NovaCart React/Vite frontend.
- The NovaCart FastAPI backend.
- PostgreSQL data models and seed data.
- Docker configuration.
- Playwright test code.
- Playwright configuration and fixtures.
- Controlled-defect implementation.
- Test-data reset and seed utilities.
- GitHub Actions regression workflow.
- Failure artifact collection.
- The client that submits failures to TriageZero.

Keeping Playwright in the NovaCart repository is recommended because the application, locators, expected behavior, test data, and defect scenarios must be versioned together.

### Repository 2: TriageZero AI platform

Suggested repository name:

```text
triagezero-ai
```

Recommended contents:

```text
triagezero-ai/
├── api/
│   └── investigation-ingestion/
├── workers/
│   └── investigation-agent/
├── agents/
│   ├── classifier/
│   ├── evidence-analyzer/
│   ├── similarity-search/
│   └── action-router/
├── dashboard/
├── schemas/
│   └── failure-package/
├── infrastructure/
├── tests/
├── Dockerfile
└── README.md
```

This repository owns:

- Failure-package ingestion API.
- Investigation job queue integration.
- Gemini and Google ADK agents.
- Classification and confidence calculation.
- Evidence extraction.
- Root-cause analysis.
- Severity and release-risk assessment.
- Similar-failure search.
- Investigation persistence.
- Engineering dashboard.
- GitHub issue or action routing.
- Google Cloud infrastructure and deployment.

## 4. System Responsibility Boundary

| Responsibility | NovaCart repository | TriageZero repository |
|---|---:|---:|
| E-commerce UI | Yes | No |
| Product and order API | Yes | No |
| PostgreSQL product data | Yes | No |
| Playwright regression tests | Yes | No |
| Controlled defects | Yes | No |
| Test execution | Yes | No initially |
| Failure artifact generation | Yes | No |
| Failure-package submission | Yes | Receives it |
| Gemini/ADK analysis | No | Yes |
| Failure classification | No | Yes |
| Root-cause investigation | No | Yes |
| Previous-failure search | No | Yes |
| Engineering dashboard | No | Yes |
| GitHub issue creation | No | Yes, through rules |

## 5. Automated End-to-End Workflow

```text
Developer push, pull request, schedule, or manual CI trigger
                              |
                              v
                    GitHub Actions starts
                              |
                              v
                Start or deploy NovaCart target
                              |
                              v
                  Reset and seed test database
                              |
                              v
                       Run Playwright
                              |
                    +---------+---------+
                    |                   |
                  Passed              Failed
                    |                   |
            Record run summary    Collect artifacts
                                        |
                                        v
                          Create failure-package.json
                                        |
                                        v
                    Upload large artifacts to Cloud Storage
                                        |
                                        v
                    POST package to TriageZero ingestion API
                                        |
                                        v
                              Return investigation ID
                                        |
                                        v
                              Publish Pub/Sub message
                                        |
                                        v
                         Cloud Run investigation worker
                                        |
                                        v
                              Gemini + Google ADK
                                        |
                                        v
                Classification, evidence, root cause, severity,
                    release risk, similarity, recommended action
                                        |
                                        v
                          Store investigation in Firestore
                                        |
                          +-------------+-------------+
                          |                           |
                          v                           v
                 Engineering dashboard       Controlled action router
                                                    |
                                                    v
                                         Optional GitHub issue/action
```

## 6. Test Execution Ownership

In the initial design, Playwright runs in the NovaCart repository through GitHub Actions.

TriageZero does not need to execute the entire Playwright suite. It receives and investigates failure information after the test runner detects a failure.

This keeps responsibilities clear:

```text
GitHub Actions + Playwright = test execution
TriageZero = test-failure investigation
```

Later, TriageZero may be allowed to request a targeted rerun by triggering a GitHub Actions workflow. That capability should be added only after the ingestion and investigation workflow is stable and authenticated.

## 7. Automation Triggers

The NovaCart regression workflow should support:

- Pull-request runs.
- Pushes to `main`.
- Scheduled regression runs.
- Manual GitHub Actions dispatch.
- Controlled-defect matrix runs.
- Optional deployment verification runs.

Recommended behavior:

| Trigger | Test scope | Defect mode |
|---|---|---|
| Pull request | Smoke and affected tests | Clean baseline |
| Push to `main` | Full regression | Clean baseline |
| Nightly schedule | Full regression | Clean baseline and approved defect matrix |
| Manual dispatch | Selected suite | User-selected scenario |
| Hackathon demo | Selected deterministic tests | One controlled defect at a time |

## 8. Playwright Baseline Suite

Before adding controlled defects, the team must establish a consistently green baseline.

Recommended test areas:

1. Frontend and backend health.
2. Product catalog loading.
3. Database-backed product content.
4. Search by product name.
5. Search by brand.
6. Search by category.
7. Search by SKU.
8. Category filtering.
9. Featured-product filtering.
10. Price-low-to-high sorting.
11. Price-high-to-low sorting.
12. Rating sorting.
13. Product-detail navigation.
14. Product specifications.
15. Adding an item to the cart.
16. Adding multiple quantities.
17. Updating cart quantity.
18. Removing a cart item.
19. Cart subtotal calculation.
20. Checkout form validation.
21. Successful order creation.
22. Confirmation-page content.
23. Backend order persistence.
24. Stock reduction after checkout.
25. Insufficient-stock rejection.
26. Responsive desktop and mobile smoke coverage.

Tests should prefer accessible role-based locators. Intentional `data-testid` attributes may be used when they represent a stable testing contract. Tests should avoid selectors that depend on CSS layout or visual styling.

## 9. Controlled-Defect Strategy

Controlled defects should be added after the baseline Playwright suite is stable.

Every controlled defect must be:

- Disabled by default.
- Deterministic.
- Reproducible.
- Enabled explicitly by a documented scenario.
- Isolated from other defects.
- Easy to reset.
- Safe for a hackathon environment.
- Mapped to a specific expected Playwright failure.
- Documented with expected evidence and classification.

Recommended baseline setting:

```env
NOVACART_DEFECT_SCENARIO=none
```

Possible individual switches:

```env
NOVACART_DEFECT_CHECKOUT_500=false
NOVACART_DEFECT_WRONG_TOTAL=false
NOVACART_DEFECT_PRODUCT_API_FAILURE=false
NOVACART_DEFECT_STOCK=false
VITE_DEFECT_BROKEN_CHECKOUT_LOCATOR=false
VITE_DEFECT_SLOW_CONFIRMATION_MS=0
```

Recommended scenario matrix:

| Scenario | Layer | Expected symptom | Expected classification |
|---|---|---|---|
| `none` | All | All tests pass | Baseline |
| `checkout_500` | Backend | Order request returns HTTP 500 | Backend/application defect |
| `wrong_total` | Backend or frontend | Expected and actual totals differ | Business-logic defect |
| `broken_locator` | Frontend | Checkout control cannot be found | UI contract or locator defect |
| `slow_confirmation` | Frontend/backend | Confirmation exceeds timeout | Performance/timing defect |
| `product_api_failure` | Backend | Catalog request returns failure | API/service defect |
| `stock_bug` | Backend | Invalid stock state or incorrect quantity behavior | Data-integrity defect |

Run only one defect per scenario initially. Multiple simultaneous defects will make evidence and expected classification ambiguous.

## 10. Hosted NovaCart Defect Safety

The normal hosted NovaCart deployment must use the clean baseline.

Do not permanently deploy a public website with every defect enabled.

Recommended options:

1. Maintain a clean staging deployment and create temporary defect deployments for CI runs.
2. Use separate Cloud Run services or revisions for specific defect scenarios.
3. Use a secured test-only control mechanism that is unavailable in a production environment.
4. For local and CI execution, start Docker Compose with one explicit defect environment setting.

Frontend defects controlled by `VITE_*` variables are usually selected at build time. The CI workflow should build a specific frontend variant for those scenarios instead of assuming the variable can be changed after the static bundle is built.

Backend defects may be selected at container startup through normal environment variables.

## 11. Failure Artifact Requirements

When a Playwright test fails, collect:

- Test name.
- Test file and line when available.
- Project and browser.
- Expected result.
- Actual result.
- Error message.
- Stack trace.
- Screenshot.
- Playwright trace.
- Video when useful.
- Browser-console messages.
- Failed network requests.
- Relevant request and response details.
- Defect scenario.
- Git repository.
- Branch.
- Commit SHA.
- GitHub Actions run ID and URL.
- Test environment.
- NovaCart deployment URL.
- Timestamp.
- Retry number.

Large binary artifacts should not be embedded directly in the ingestion JSON. Upload them to Cloud Storage and include authenticated object references in the failure package.

## 12. Failure-Package Contract

The failure package must be versioned so NovaCart automation and TriageZero can evolve independently.

Example:

```json
{
  "schema_version": "1.0",
  "source": "novacart-playwright",
  "run": {
    "run_id": "github-run-12345",
    "run_url": "https://github.com/example/novacart/actions/runs/12345",
    "trigger": "pull_request",
    "started_at": "2026-08-25T18:00:00Z"
  },
  "repository": {
    "name": "novacart-target",
    "branch": "main",
    "commit_sha": "abc123"
  },
  "environment": {
    "name": "staging",
    "target_url": "https://novacart-staging.example.com",
    "browser": "chromium",
    "defect_scenario": "checkout_500"
  },
  "test": {
    "test_id": "checkout-creates-order",
    "name": "Checkout creates an order",
    "file": "tests/playwright/specs/checkout.spec.js",
    "status": "failed",
    "retry": 0
  },
  "failure": {
    "message": "Expected HTTP 201 but received HTTP 500",
    "stack_trace": "...",
    "expected": "201 Created",
    "actual": "500 Internal Server Error"
  },
  "artifacts": {
    "screenshot_uri": "gs://triagezero-failures/run-12345/screenshot.png",
    "trace_uri": "gs://triagezero-failures/run-12345/trace.zip",
    "video_uri": null,
    "network_log_uri": "gs://triagezero-failures/run-12345/network.json",
    "console_log_uri": "gs://triagezero-failures/run-12345/console.json"
  }
}
```

The ingestion API should reject unsupported schema versions and invalid packages with clear validation errors.

## 13. TriageZero Ingestion API

Recommended endpoint:

```text
POST /api/v1/investigations
```

Recommended response:

```json
{
  "investigation_id": "inv_01JEXAMPLE",
  "status": "queued",
  "received_at": "2026-08-25T18:01:00Z"
}
```

Additional useful endpoints:

```text
GET /api/v1/investigations/{investigation_id}
GET /api/v1/investigations
POST /api/v1/investigations/{investigation_id}/rerun
```

The rerun endpoint should be deferred until GitHub authentication, authorization, audit logging, and workflow dispatch are designed.

## 14. TriageZero Investigation Output

The agent must return structured data rather than only free-form prose.

Recommended output fields:

```json
{
  "investigation_id": "inv_01JEXAMPLE",
  "status": "completed",
  "classification": "backend_application_defect",
  "confidence": 0.94,
  "severity": "high",
  "release_risk": "block_release",
  "root_cause": "The checkout defect scenario forces the order endpoint to return HTTP 500.",
  "evidence": [],
  "similar_failures": [],
  "recommended_action": "Create engineering issue",
  "action_taken": null
}
```

The action router must use explicit rules. The AI should not automatically perform every suggested action.

## 15. Google Cloud Architecture

Recommended services:

| Google Cloud service | Purpose |
|---|---|
| Cloud Run | Ingestion API, investigation worker, and dashboard backend |
| Cloud Storage | Screenshots, traces, videos, reports, and logs |
| Pub/Sub | Asynchronous investigation queue |
| Firestore | Investigation records, evidence metadata, and status |
| Gemini | Failure analysis and reasoning |
| Google ADK | Agent orchestration |
| Secret Manager | Runtime secrets when secrets are required |
| Artifact Registry | Container images |
| Cloud Logging | Service and investigation logs |

Recommended cloud flow:

```text
GitHub Actions
    |
    | authenticated request
    v
Cloud Run ingestion API
    |
    +----> Firestore: queued investigation record
    |
    +----> Pub/Sub: investigation message
                    |
                    v
             Cloud Run worker
                    |
                    v
              Gemini + ADK
                    |
                    v
          Firestore: completed result
                    |
                    v
             TriageZero dashboard
```

Official references:

- Cloud Run service-to-service authentication: https://docs.cloud.google.com/run/docs/authenticating/service-to-service
- Workload Identity Federation for deployment pipelines: https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- Pub/Sub push delivery: https://docs.cloud.google.com/pubsub/docs/push
- Pub/Sub with Cloud Run: https://docs.cloud.google.com/run/docs/tutorials/pubsub
- Cloud Storage signed URLs: https://docs.cloud.google.com/storage/docs/access-control/signed-urls

## 16. Authentication and Security

### GitHub Actions to Google Cloud

Use GitHub OIDC with Google Cloud Workload Identity Federation.

Do not store a long-lived Google Cloud service-account JSON key in GitHub unless there is no supported alternative.

The GitHub workflow should receive only the permissions it needs:

- Permission to invoke the TriageZero ingestion service.
- Permission to upload failure artifacts to the designated Cloud Storage path.
- No administrative project access.

### Cloud Run services

- Keep ingestion and worker services authenticated.
- Use separate service accounts for ingestion and investigation workers.
- Grant least-privilege IAM roles.
- Authenticate Pub/Sub push requests.
- Validate every failure package.
- Enforce request-size limits.
- Restrict artifact file types and sizes.
- Avoid exposing internal Cloud Storage objects publicly.
- Record audit information for engineering actions.

### Repository security

Never commit:

- `.env` files.
- Gemini API keys.
- Google Cloud credentials.
- Service-account files.
- GitHub tokens.
- Database passwords.
- Private signed artifact URLs.

Use `.env.example`, GitHub repository variables, GitHub encrypted secrets when unavoidable, Workload Identity Federation, and Google Secret Manager.

## 17. Manual Upload Role

The TriageZero dashboard may provide a manual upload feature for:

- Local demonstrations.
- Previously captured failure packages.
- Troubleshooting the ingestion schema.
- Hackathon judge interaction.
- Environments that are not connected to CI.

Manual upload is a secondary path:

```text
Primary path: GitHub Actions -> ingestion API
Fallback path: Human -> dashboard upload -> ingestion API
```

Both paths must produce the same validated, versioned failure-package model.

## 18. Dashboard Design

The dashboard is an engineering tool, not a chatbot.

Recommended views:

### Investigation list

- Latest failures.
- Status.
- Repository and branch.
- Test name.
- Classification.
- Confidence.
- Severity.
- Release risk.
- Defect scenario.

### Investigation details

- Failure summary.
- Expected versus actual result.
- Evidence timeline.
- Screenshot and trace links.
- Browser-console and network evidence.
- Root cause.
- Similar failures.
- Recommended action.
- Action taken.
- GitHub issue link when created.

### System status

- Queued investigations.
- Running investigations.
- Failed investigations.
- Average investigation time.
- Recent ingestion errors.

## 19. Engineering Actions

Possible actions include:

- Create a GitHub issue.
- Add structured labels.
- Assign a team or component.
- Block a release in the dashboard.
- Recommend a targeted rerun.
- Mark a failure as likely test-related.
- Link a previous matching failure.

For the first hackathon version, automatic actions should be conservative. It is sufficient to create a well-structured proposed action and require approval before external mutation.

## 20. Implementation Milestones

### Milestone 1 — NovaCart baseline

**Status:** Functionally complete.

- [x] React/Vite storefront.
- [x] FastAPI backend.
- [x] PostgreSQL products and orders.
- [x] Product seed data.
- [x] Cart and checkout.
- [x] Order confirmation.
- [x] Docker Compose.
- [x] Desktop and mobile validation.

Remaining cleanup:

- [ ] Automatically seed a fresh environment or document the required step prominently.
- [ ] Add a favicon.
- [ ] Decide whether to adopt React Router and Context API.
- [ ] Decide whether to separate backend service and repository layers.
- [ ] Add migrations when the schema begins evolving.

### Milestone 2 — Green Playwright baseline

**Owner:** Test-automation teammate.

- [ ] Add Playwright configuration.
- [ ] Add test fixtures and helpers.
- [ ] Add stable page objects only where they reduce duplication.
- [ ] Automate catalog tests.
- [ ] Automate product-detail tests.
- [ ] Automate cart tests.
- [ ] Automate checkout tests.
- [ ] Add API checks.
- [ ] Configure screenshots, traces, and reports.
- [ ] Make the complete baseline consistently green.

### Milestone 3 — Controlled defects

**Owners:** NovaCart owner and test-automation teammate.

- [ ] Define the defect configuration contract.
- [ ] Implement defects disabled by default.
- [ ] Add one Playwright scenario for each defect.
- [ ] Validate one defect at a time.
- [ ] Document expected evidence and classification.
- [ ] Add reset behavior.

### Milestone 4 — NovaCart CI

- [ ] Add GitHub Actions regression workflow.
- [ ] Start the application stack.
- [ ] Wait for service health.
- [ ] Reset and seed test data.
- [ ] Run Playwright.
- [ ] Upload Playwright reports.
- [ ] Produce `failure-package.json`.
- [ ] Preserve failure artifacts.

### Milestone 5 — TriageZero ingestion foundation

- [ ] Create the separate TriageZero repository.
- [ ] Define failure-package schema version `1.0`.
- [ ] Implement the ingestion endpoint.
- [ ] Validate and persist incoming packages.
- [ ] Return an investigation ID.
- [ ] Add investigation status endpoints.
- [ ] Build a minimal dashboard list and detail view.

### Milestone 6 — Automatic CI-to-TriageZero delivery

- [ ] Create the artifact bucket.
- [ ] Configure Workload Identity Federation.
- [ ] Authenticate GitHub Actions.
- [ ] Upload failure artifacts.
- [ ] Submit failure packages automatically.
- [ ] Link GitHub runs and artifacts in the dashboard.

### Milestone 7 — AI investigation

- [ ] Add Pub/Sub queue.
- [ ] Add Cloud Run investigation worker.
- [ ] Integrate Gemini.
- [ ] Add Google ADK orchestration.
- [ ] Produce structured investigation output.
- [ ] Store evidence and results in Firestore.
- [ ] Display results in the dashboard.
- [ ] Validate the known controlled-defect scenarios.

### Milestone 8 — Similarity and action routing

- [ ] Search previous failures.
- [ ] Rank similar incidents.
- [ ] Add release-risk policy.
- [ ] Generate proposed engineering actions.
- [ ] Add optional GitHub issue creation.
- [ ] Record all action decisions and outcomes.

## 21. Team Responsibilities

### NovaCart/application owner

- Maintain the working baseline.
- Review data and API changes.
- Maintain Docker and seed behavior.
- Implement controlled defect switches.
- Keep defects disabled by default.
- Document expected defect symptoms.

### Test-automation owner

- Build and maintain the Playwright suite.
- Keep tests deterministic and independent.
- Use stable locators.
- Add failure artifact collection.
- Implement CI execution.
- Produce the versioned failure package.

### TriageZero/AI owner

- Build the ingestion API.
- Define and version schemas.
- Implement queue and worker processing.
- Build Gemini/ADK investigation agents.
- Store investigations and evidence.
- Build the engineering dashboard.
- Implement controlled, auditable actions.

### Shared responsibilities

- Review pull requests.
- Keep `main` green in both repositories.
- Keep secrets out of Git.
- Update architecture documentation.
- Test integration contracts together.
- Agree before changing the failure-package schema.

## 22. Branch Strategy

Suggested NovaCart branches:

```text
main
playwright-regression-tests
controlled-defects
github-actions-regression
```

Suggested TriageZero branches:

```text
main
ingestion-api
investigation-worker
dashboard
cloud-infrastructure
```

Keep commits focused. Avoid mixing NovaCart UI redesigns, Playwright tests, defect implementation, and TriageZero AI code in one pull request.

## 23. Definition of Done for Automated Investigation

The first complete automated workflow is done when:

1. NovaCart is running in a known environment.
2. Test data is deterministic.
3. Playwright runs automatically from GitHub Actions.
4. A controlled defect produces the intended failure.
5. Playwright captures the expected artifacts.
6. Large artifacts are uploaded securely.
7. GitHub Actions submits a valid failure package.
8. TriageZero returns an investigation ID.
9. Pub/Sub starts an investigation worker.
10. Gemini/ADK produces structured analysis.
11. The analysis identifies the known controlled defect.
12. Evidence and confidence appear in the dashboard.
13. The dashboard shows the Git commit, test, run, artifacts, classification, root cause, severity, and release risk.
14. The clean baseline continues to pass after the demonstration.

## 24. Immediate Next Actions

### NovaCart team

- [ ] Finish and merge the green Playwright suite.
- [ ] Add deterministic database reset behavior.
- [ ] Implement controlled defects one at a time.
- [ ] Add artifact capture and a custom failure-package generator.
- [ ] Add the GitHub Actions workflow.

### TriageZero team

- [ ] Create the separate `triagezero-ai` repository.
- [ ] Copy the version `1.0` failure-package proposal into that repository.
- [ ] Implement a local ingestion API before adding AI.
- [ ] Store queued investigations.
- [ ] Build a minimal engineering dashboard.
- [ ] Connect one known Playwright failure end to end.
- [ ] Add Gemini/ADK only after ingestion works reliably.

## 25. Final Approved Direction

The approved project direction is:

```text
NovaCart repository
    = website + API + database + Playwright + defects + CI

TriageZero repository
    = ingestion + AI investigation + evidence + dashboard + actions

GitHub Actions
    = automatic bridge between the two systems
```

Manual upload is optional. The primary demonstration and production-style workflow should automatically transform a Playwright failure into a TriageZero investigation without requiring a person to move files between the two applications.
