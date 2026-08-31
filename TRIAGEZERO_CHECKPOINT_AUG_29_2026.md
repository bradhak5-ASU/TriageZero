# TriageZero + NovaCart — Project Checkpoint

**Checkpoint date:** August 29, 2026
**Purpose:** Record what has been built, why it was built, what was verified, and what remains before production and the final demo.

## 1. Final project goal

TriageZero is an autonomous test-failure investigation system. NovaCart is the controlled target application used to demonstrate it.

The intended production flow is:

```text
Code change or manual demo trigger
        ↓
Google Cloud CI/CD runs the Playwright suite against NovaCart
        ↓
A test fails and Playwright captures sanitized evidence
        ↓
The reporter automatically submits failure-package v1.0
        ↓
TriageZero validates, stores, and analyzes the investigation
        ↓
Gemini through Google ADK classifies the failure and proposes an action
        ↓
TriageZero shows the evidence, root cause, confidence, risk, and recommendation
        ↓
Evaluation compares the prediction with a private oracle
```

The failure package never contains the planted-defect name or expected answer. This separation is necessary to prove that the AI inferred the result from evidence instead of being given the answer.

## 2. Why the project is split into two repositories

### NovaCart — `TriageZero`

This repository contains the target website, its backend, Playwright automation, controlled defect switches, evidence collection, and automatic failure upload.

### AI platform — `TriageZero-AI`

This repository contains the investigation API, database, TriageZero dashboard, deterministic analyzer, direct Gemini analyzer, Google ADK workflow, evaluation system, and future Google Cloud adapters.

The separation represents an enterprise arrangement: the tested application produces evidence, while the external triage platform consumes and investigates it.

## 3. Work completed

### NovaCart and Playwright

- A working NovaCart frontend and backend exist.
- A clean Playwright baseline passes with 4 passed and 0 failed.
- The controlled `checkout_500` scenario can be enabled without breaking clean mode.
- The failure correctly reports expected HTTP 201 and actual HTTP 500.
- Playwright captures the test identity, failure message and stack, expected and actual values, console errors, failed network request, screenshot, and trace.
- `failure-package.json` uses schema version 1.0 and machine-independent relative paths.
- Evidence is separated from private evaluation metadata.
- Safeguards reject private oracle fields such as controlled defect names and expected classifications.
- Failed runs can automatically upload a package to `POST /api/v1/investigations`.
- Upload idempotency, structured API errors, text sanitization, and network-evidence normalization are implemented.

### TriageZero AI application

- The React/Vite/TypeScript dashboard and FastAPI backend are built.
- Investigation ingestion, validation, persistence, detail, lifecycle, health, and approval flows exist.
- The v1 API is a strict closed schema and rejects unexpected or private-oracle fields.
- Request-size, concurrency, and idempotency hardening are implemented.
- Three analyzers share one validated result contract:
  - deterministic local rules;
  - direct Gemini structured analysis;
  - staged Google ADK analysis.
- Model output is schema-validated before persistence.
- Severity and release risk use deterministic application policy rather than allowing generated text to control release decisions.
- Recommended actions remain approval-gated; TriageZero does not silently execute them.
- Private evaluation data is kept outside failure evidence and Gemini input.
- Local tests previously passed: 231 backend tests and Ruff validation.
- The Gemini key is stored only in ignored `backend/.env`; it is not in source control.

### Reliability work completed for ADK

- Direct Gemini and ADK have separate timeouts because ADK performs several sequential model/tool turns.
- ADK has bounded retry behavior for transient provider failures.
- Safe provider-attempt metadata records rate limits and provider failures without exposing secrets.
- A rate-limit failure degrades truthfully to deterministic fallback instead of pretending that ADK succeeded.
- The required local packages are pinned: `google-adk==1.35.2` and `google-genai==1.75.0`.
- A local ignored Python environment now contains the declared ADK dependencies.

## 4. ADK verification history

### Earlier successful test

Investigation `INV-6828FADF` completed through the real `gemini_adk` provider with no fallback. It classified the evidence as `backend_application_defect`, confidence 0.95, severity high, and release risk `block_release`. All seven ADK stages completed.

### Quota test

A later scenario returned HTTP 429 `RESOURCE_EXHAUSTED`. The system recorded a `rate_limit` error, performed only the bounded allowed attempts, and used deterministic fallback. This proved the failure handling worked, but the result was not used as an AI-accuracy measurement.

### Paid-tier smoke test — August 29, 2026

AI Studio billing was funded with $10 and configured with a $10 cap. Only one controlled ADK smoke test was run.

- Investigation: `INV-B2CCB5FC`
- Status: completed
- Provider: `gemini_adk`
- Model: `gemini-3.6-flash`
- Fallback used: no
- Provider attempts: 1 successful attempt
- Classification: `backend_application_defect`
- Confidence: 0.95
- Severity: high
- Release risk: `block_release`
- ADK/model duration: 20,618 ms
- End-to-end investigation time: about 22 seconds
- Input tokens: 19,934
- Output tokens: 1,601
- All seven workflow stages: completed

This is the required proof that local Google ADK, the Gemini API key, paid quota, structured output, persistence, and TriageZero processing work together. The temporary backend was stopped after verification.

An earlier attempt, `INV-00E481DE`, used deterministic fallback with `sdk_missing` because it was launched using the system Python instead of the project environment. It made no real ADK model call. The missing local environment was then corrected before the successful test above.

## 5. Current position

The local AI integration is no longer blocked. Direct Gemini works, and Google ADK has now been genuinely verified after billing was enabled. We do not need to run repeated paid tests immediately.

The project is not production-complete yet. The remaining work is Cloud infrastructure, additional controlled test scenarios, full accuracy evaluation, production security/configuration, and a complete deployed demonstration.

Local ADK reliability changes in `TriageZero-AI` are still uncommitted and must be reviewed, tested once more offline, then committed and pushed before deployment. The `.env`, API key, local database, and `.venv` remain ignored and must never be committed.

## 6. Immediate next work

### Teammate — NovaCart and test automation

1. Keep the clean Playwright baseline green.
2. Finish additional controlled, switchable defect scenarios one at a time.
3. For each scenario, record its private expected classification, severity, and release risk only in the evaluation subsystem.
4. Confirm each defect is off by default and fails for the intended reason when enabled.
5. Ensure every failure produces the strict sanitized v1.0 package and uploads automatically.
6. Add tests for the evidence builder, oracle-leak protection, upload behavior, and idempotency.
7. Do not add Gemini credentials or expected answers to submitted evidence.

### TriageZero AI side

1. Review the uncommitted ADK retry/timeout changes and run the full offline test suite.
2. Commit and push those code changes without `.env`, `.venv`, databases, or credentials.
3. Run the small controlled evaluation set against deterministic, direct Gemini, and ADK using identical evidence.
4. Measure classification accuracy, macro-F1, confidence calibration, fallback rate, latency, and token use.
5. Inspect every mismatch instead of changing expected answers to make the score look better.

### Google Cloud and production

1. Create/select the final Google Cloud project and verify billing controls.
2. Enable the required APIs and configure least-privilege identities and Secret Manager.
3. Move production Gemini access to Vertex AI/Google Cloud authentication when ready.
4. Deploy the TriageZero frontend and backend to Cloud Run.
5. Replace or connect local-only infrastructure with the planned managed services where required: Pub/Sub, Firestore, and Cloud Storage.
6. Configure Google Cloud CI/CD to run Playwright and upload failed evidence automatically.
7. Add a safe manual trigger for the recorded demo while preserving the same enterprise pipeline.
8. Run one complete production rehearsal before recording.

## 7. Accuracy and proof plan

Accuracy must be measured against private expected results, not judged from a good-looking dashboard response.

For each controlled scenario:

1. The teammate records the intended defect and expected outcome privately.
2. Playwright submits only observable evidence.
3. TriageZero stores the actual Gemini/ADK prediction.
4. The evaluation system joins the prediction to the private oracle outside the analyzer.
5. The dashboard/report shows correct, incorrect, low-confidence, and fallback outcomes honestly.

The final demo should show at least one clean run and several different failing scenarios. It should clearly show the automatic trigger, evidence capture, upload, real ADK provider metadata, investigation result, private evaluation comparison, and the approval boundary for recommended actions.

## 8. Cost control

- The account currently has $10 funded and a user-configured $10 limit/cap.
- ADK is more token-intensive than direct Gemini because it performs multiple turns.
- Do not run the full evaluation repeatedly.
- Use offline tests and deterministic mode during ordinary development.
- Use direct Gemini for cheaper integration checks.
- Reserve ADK for the controlled evaluation, production rehearsal, and demo.
- Continue checking AI Studio usage after every evaluation batch.

## 9. Definition of final success

The project is complete when a real or controlled NovaCart regression automatically triggers Playwright, sanitized evidence is uploaded without private answers, the deployed TriageZero service analyzes it using Gemini through ADK, the dashboard displays a traceable investigation, evaluation measures the prediction honestly, and the entire flow can be reproduced live without manual file upload or hidden intervention.
