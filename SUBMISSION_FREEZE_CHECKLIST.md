# TriageZero — Submission Freeze Checklist

Freeze only when every required item is checked. Record the final commit SHA and UTC verification time in the submission portal or release notes.

## Judge access

- [x] A dedicated least-privilege Firebase email/password judge account exists.
- [x] The account is an Authentication user, is absent from Firebase project users/permissions, and has no separately granted Cloud Console, GitHub write, billing, deployment, or secret access.
- [x] Credentials were tested successfully in a fresh private/incognito window.
- [ ] Credentials are present only in the submission portal's private field, not Git, issues, screenshots, logs, or chat.
- [ ] The temporary password remains valid for the full judging window.

## Private testing instructions

- [x] `JUDGE_TESTING_INSTRUCTIONS.md` documents URLs, the evaluation path, safe boundaries, repository disclosure, and troubleshooting without containing secrets.
- [ ] The portal copy has the final judge email and temporary password substituted for the placeholders.
- [ ] The portal copy identifies a monitored submission contact.

## README and reproducibility

- [x] The README identifies both repositories and their responsibilities.
- [x] The README includes credential-free, clean-machine Docker spin-up steps for both repositories.
- [x] The README includes seeding, health checks, Playwright safeguards, baseline execution, shutdown, and credential handling.
- [x] A clean clone of both final commits completes the documented local path.

## Public and incognito verification

- [x] Dashboard URL returns HTTP 200 without relying on local state.
- [x] TriageZero liveness and readiness endpoints return HTTP 200.
- [x] NovaCart web and health endpoint return HTTP 200.
- [x] Both public GitHub repository URLs return HTTP 200.
- [x] Fresh private/incognito login succeeds with the dedicated judge account.
- [ ] The investigation list and one completed investigation render after login.
- [ ] NovaCart loads in the same private session without authentication.
- [ ] No browser console error blocks the judge path.

## Security and disclosure

- [x] High-confidence secret scan of tracked and proposed files is clean.
- [x] `.env` is ignored, and tokens, passwords, service-account JSON, Firebase admin credentials, and private portal content are absent from the proposed Git changes.
- [x] Private evaluation/oracle data is rejected by the evidence builder and submission client (22 safeguard tests passed).
- [ ] Claims, provider names, model names, counts, dates, and screenshots match the deployed revision.
- [x] Approval/rejection behavior is described accurately as recorded human decisions, not automatic external execution.

## Final Git synchronization

- [x] Intended documentation and source changes are committed in both repositories.
- [x] Local `main` is aligned with `origin/main` in both repositories.
- [x] Required `main` branches are pushed and both repositories are publicly readable; no submission tag is currently required.
- [x] README and judge-document links resolve at the final remote commit.
- [ ] Final commit SHAs are copied into the submission record.
- [x] No untracked submission-critical file remains only on one workstation.

## Freeze

- [x] Final end-to-end rehearsal completed without editing production data.
- [ ] Submission title, description, video, URLs, repository links, and private instructions were reviewed once in their rendered form.
- [ ] Submission was saved and re-opened to verify persistence.
- [ ] Team agrees that no deployments, credential rotations, schema changes, or force-pushes occur during judging unless required to restore availability.
- [ ] A rollback contact and the last known-good Cloud Run revisions are recorded privately.

## Verification record

Last recorded check: **2026-08-31 06:19:39 UTC**.

- HTTP checks returned 200 for the dashboard, TriageZero liveness/readiness, NovaCart web/API health, and both public GitHub repositories.
- A new isolated Chromium context rendered the dashboard sign-in screen and NovaCart with no page or console errors. This validates clean public-session behavior but does not replace the pending dedicated-account login check.
- The NovaCart frontend production build, Python compilation, Docker Compose validation, Git whitespace check, and all 22 Playwright safeguard tests passed.
- Git synchronization record: TriageZero submission-document content at `0d90a716df5a35fe6fee5589c6687ad93bd94ac9`; final checklist-status commit to be copied from GitHub after this file is frozen; `TriageZero-AI` at `d7ccfcdbe8410b3174f4604df2079dc1ed9c830f`.
- Clean-clone rehearsal: cloned both public `main` branches into a new temporary directory, copied only the documented `.env.example`, built all Docker images, started fresh data volumes, seeded 24 NovaCart products, and received healthy API responses and HTTP 200 from both web apps.
- Clean-clone tests: 22 evidence/authentication safeguards and four real Chromium NovaCart baseline flows passed; dependency installs reported zero npm vulnerabilities.
- Local end-to-end failure rehearsal: the controlled checkout returned the expected HTTP 500, Playwright captured evidence and artifacts, submission returned HTTP 202, and fresh TriageZero investigation `INV-0D7DBB27` completed as `backend_application_defect` with confidence `0.93`, `block_release`, and an approval-gated action.
- Rehearsal containers and data volumes were removed; the original local stacks were restored with their pre-existing data intact. No production data or deployment was changed.
