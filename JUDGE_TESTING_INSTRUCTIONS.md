# TriageZero — Private Judge Testing Instructions

Use this document as the source for the submission portal's private testing-instructions field. Replace the bracketed credential placeholders in the private portal only. Never add credentials to this file or any repository.

## Access

| Item | Value |
|---|---|
| Dashboard | https://triagezero-web-oszu77g5xq-uc.a.run.app |
| Judge email | `[provided privately in the submission portal]` |
| Temporary password | `[provided privately in the submission portal]` |
| Public NovaCart demo | https://novacart-web-oszu77g5xq-uc.a.run.app |
| Backend readiness | https://triagezero-api-oszu77g5xq-uc.a.run.app/api/v1/readyz |

The dedicated judge account is intended only for the dashboard. It does not grant Google Cloud Console, GitHub write, billing, deployment, or secret access.

## Recommended evaluation path

1. Open a fresh private/incognito browser window with password-manager autofill disabled.
2. Open the dashboard URL and sign in with the privately supplied judge credentials.
3. Confirm that the investigations list loads and open a completed investigation.
4. Inspect the classification, root cause, confidence, severity, release risk, evidence, provider/model provenance, workflow stages, token/latency metadata, fallback state, and audit timeline.
5. Confirm that the recommended action remains `awaiting approval`. Approval or rejection records a human decision; it does not execute an external change.
6. Open the public NovaCart demo and browse the catalogue to confirm that the tested application is a separate service and requires no login.
7. Open the readiness URL and confirm `{"status":"ready"}`.

## What the system demonstrates

- A scheduled Cloud Run Playwright job tests the separately deployed NovaCart application.
- On failure, the runner captures observable browser evidence and submits a strict `failure-package` v1.0 payload.
- The package excludes private ground-truth fields and credentials.
- TriageZero validates, sanitizes, deduplicates, stores, and analyzes the investigation.
- Google ADK invokes Gemini through Vertex AI using bounded, read-only evidence tools.
- Deterministic application policy owns severity/release risk, and a human owns approval.

## Public source disclosure

- NovaCart and evidence producer: https://github.com/bradhak5-ASU/TriageZero
- TriageZero AI platform: https://github.com/bradhak5-ASU/TriageZero-AI

Both repositories are required for complete local reproduction. There is no undisclosed private source repository required to run the project. Credentials and cloud identities are runtime configuration and are intentionally excluded.

## Safe testing boundaries

- Judges may sign in, browse investigations, inspect evidence, filter/search, and record an approval or rejection.
- Do not attempt to access Google Cloud Console, Firebase administration, Secret Manager, billing, or deployment controls.
- Do not reuse, publish, or commit the supplied credentials.
- Do not expect approval to create a GitHub issue or modify production; external execution is intentionally disabled/approval-gated.

## Troubleshooting

- If sign-in fails, confirm the email is typed exactly and no saved password was autofilled.
- If the dashboard is unavailable, check the readiness URL. A non-ready response indicates a service issue, not a credential issue.
- If the browser has stale state, close all private windows and begin a new private session.
- Submission contact: use the contact method registered with the competition/submission portal.
