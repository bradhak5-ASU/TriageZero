# TriageZero — Submission Freeze Checklist

Freeze only when every required item is checked. Record the final commit SHA and UTC verification time in the submission portal or release notes.

## Judge access

- [ ] A dedicated least-privilege Firebase email/password judge account exists.
- [ ] The account is not an owner/admin and has no Cloud Console, GitHub write, billing, deployment, or secret access.
- [ ] Credentials were tested in a fresh private/incognito window with autofill disabled.
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
- [ ] A clean clone of both final commits completes the documented local path.

## Public and incognito verification

- [x] Dashboard URL returns HTTP 200 without relying on local state.
- [x] TriageZero liveness and readiness endpoints return HTTP 200.
- [x] NovaCart web and health endpoint return HTTP 200.
- [x] Both public GitHub repository URLs return HTTP 200.
- [ ] Fresh private/incognito login succeeds with the dedicated judge account.
- [ ] The investigation list and one completed investigation render after login.
- [ ] NovaCart loads in the same private session without authentication.
- [ ] No browser console error blocks the judge path.

## Security and disclosure

- [x] High-confidence secret scan of tracked and proposed files is clean.
- [x] `.env` is ignored, and tokens, passwords, service-account JSON, Firebase admin credentials, and private portal content are absent from the proposed Git changes.
- [x] Private evaluation/oracle data is rejected by the evidence builder and submission client (22 safeguard tests passed).
- [ ] Claims, provider names, model names, counts, dates, and screenshots match the deployed revision.
- [ ] Approval/rejection behavior is described accurately as recorded human decisions, not automatic external execution.

## Final Git synchronization

- [ ] Intended documentation and source changes are committed in both repositories.
- [ ] Local `main` is aligned with `origin/main` in both repositories.
- [ ] Required branches/tags are pushed and both repositories are publicly readable.
- [ ] README links resolve at the final remote commit.
- [ ] Final commit SHAs are copied into the submission record.
- [ ] No untracked submission-critical file remains only on one workstation.

## Freeze

- [ ] Final end-to-end rehearsal completed without editing production data.
- [ ] Submission title, description, video, URLs, repository links, and private instructions were reviewed once in their rendered form.
- [ ] Submission was saved and re-opened to verify persistence.
- [ ] Team agrees that no deployments, credential rotations, schema changes, or force-pushes occur during judging unless required to restore availability.
- [ ] A rollback contact and the last known-good Cloud Run revisions are recorded privately.

## Verification record

Last recorded check: **2026-08-31 05:44:55 UTC**.

- HTTP checks returned 200 for the dashboard, TriageZero liveness/readiness, NovaCart web/API health, and both public GitHub repositories.
- A new isolated Chromium context rendered the dashboard sign-in screen and NovaCart with no page or console errors. This validates clean public-session behavior but does not replace the pending dedicated-account login check.
- The NovaCart frontend production build, Python compilation, Docker Compose validation, Git whitespace check, and all 22 Playwright safeguard tests passed.
