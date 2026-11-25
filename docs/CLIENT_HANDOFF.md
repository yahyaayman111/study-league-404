# 404 Study League — Client Handoff

**Prepared for:** team404m@gmail.com
**Date:** 25 November 2026
**Live application:** https://study-league-404.vercel.app
**Vercel project:** https://vercel.com/404-a136/study-league-404
**Source code:** https://github.com/yahyaayman111/study-league-404

---

## 1. What you received

- A deployed **404 Study League** module integrated into the 404 learning platform, using the supplied 404 logo.
- Full Arabic-first RTL interface with responsive desktop, tablet, and mobile layouts.
- A public source repository containing the application, documentation, screenshots, and a 19-test rule suite.
- A Vercel project and the production domain `study-league-404.vercel.app`, transferred to your team **404**.
- Demo data and demo accounts so every workflow can be tested without setup.

> This is a front-end prototype. Accounts, payments, voting records, and uploaded files are stored in each visitor's browser (`localStorage`). See **Known limitations** before using real data.

---

## 2. Demo accounts

| Role | Access code | What to use it for |
| --- | --- | --- |
| Group Admin | `ADMIN-404` | Create/edit competitions, approve results, finance, roles, publishing, audit |
| Student | `STU1001` | Join, upload a summary, read anonymously, vote, library, achievements |
| Student / Summary Editor | `STU1004` | Review-only editor permissions |
| Platform Admin | `OWNER-404` | Same administration scope across the group |
| Other students | `STU1002` … `STU1006` | Additional participants and seeded submissions |

Use the quick-fill buttons on the login page, or type any name with the code. Learner codes are validated (`STU1001`–`STU1006`).

---

## 3. What was implemented

### Competitions
- Independent weekly competition per subject inside a group.
- Five-state lifecycle: `UPCOMING → SUBMISSION_OPEN → VOTING_OPEN → PENDING_APPROVAL → COMPLETED`.
- Competition fields: subject, lecture/title, instructions, start date, submission deadline, voting window, contribution fee (default 10 EGP).
- Student registration, contribution tracking, and handwritten summary upload (up to 6 images, replaceable only before the deadline).
- Other submissions remain hidden during the submission phase.

### Anonymous voting & fairness
- Maximum **3 votes** for **different** summaries; using 1 or 2 votes is allowed and is not an error.
- One vote per summary, no duplicate ballots, no self-voting.
- Neutral labels (`ملخص مشارك #1`, …) with shuffled order.
- Final confirmation permanently locks the voter's choices.
- Vote counts and standings stay hidden until the Group Admin approves the results.
- Author identities are revealed only after approval.

### Results, tie-breaker & prizes
- Top-3 ranking, 3/2/1 annual points.
- First-place tie-breaker uses each tied student's historical votes in **other subjects' completed competitions**.
- A persistent tie becomes a **joint first place**: both winners receive 3 points, both summaries are eligible for publication, and no arbitrary winner is chosen.
- Prize pool = paid participants × contribution fee.
- Normal winner receives the full prize.
- Joint winners' prize stays `ON_HOLD_FOR_JOINT_WINNER_AGREEMENT` until the admin records the agreed settlement manually (amount, recipients, date, notes).
- Every financial change is recorded in the ledger and audit log.

### Library & Book Reader
- Official subject summary library with search, subject filter, newest/oldest sorting, and per-entry PDF.
- **Book Reader is the default** viewing mode: two-page RTL spread on desktop, single page on mobile, keyboard arrows, page counter, page dots.
- Standard View toggle preserves the reading position.
- Locked, non-removable attribution card: subject, lecture, author, publication date, competition, rank.
- Bulk download creates a ZIP of individual PDFs.

### PDF & downloads
- Arabic RTL PDFs for handwritten scans and digital summaries.
- Existing PDFs can be downloaded directly (when present).
- Individual and bulk downloads respect access rules.
- Filenames are sanitized and based on subject/lecture.
- Generated entirely in the browser; the original uploaded file is never modified.

### Hall of Fame & annual champion
- Per-subject Hall of Fame with winners for every completed competition.
- Overall Hall of Fame with a Top-3 podium and full leaderboard (points, gold/silver/bronze, badges, subjects).
- Yearly archive and **404 Annual Champion** crowning.
- Only approved results appear; provisional results are hidden.

### Roles, badges & audit
- `Summary Contributor`: recognition badge only — **no permissions**.
- `Summary Editor`: functional role for preliminary review and suggestions — **cannot approve results or publish summaries**.
- Group Admin retains final approval and publishing authority.
- Immutable audit log for approvals, financial records, role changes, publishing, and sensitive operations.
- In-app notifications with deep links.

### Dashboards
- League metrics: active competitions, submissions, voting status, prizes delivered, points awarded.
- Recent winners, top contributors, latest library entries, and upcoming dates.
- Student achievement page: points, rank, medals, contribution history, participation log, badges, and published summaries.

---

## 4. Client test plan (30–40 minutes)

Run the tests in **incognito/private mode** so the demo starts from a clean state. If you have already tested, use **Admin → Annual → Reset demo data** to restore the seed.

### A. Student experience — log in with `STU1001`

1. Open **League** from the sidebar.
2. Check the dashboard metrics, recent winners, and latest library entries.
3. Open **Competitions → "المحاضرة 2: أعلاف الدواجن والطاقة"** (voting open).
   - Confirm all summary cards use neutral numbers and no author names.
   - Confirm your own card says **"ملخصك الخاص، لا يمكن التصويت له"** and has no vote button.
   - Select **2** summaries (not 3). The counter must say **"استخدمت 2 من 3 أصوات"**.
   - Click **Confirm**, review the confirmation dialog, and confirm.
   - Expected: **"تم تثبيت تصويتك"**, and you cannot change or withdraw your votes.
4. Open **Competitions → "المحاضرة 1: هضم الألياف"** (submission open).
   - Upload 1–2 JPG/PNG images and submit.
   - Confirm your submission shows as uploaded and that other students' submissions are not visible.
5. Open **Library**.
   - Open any summary. The **Book Reader** must open by default with a two-page spread on desktop.
   - Use the keyboard left/right arrows; check the page counter.
   - Switch to **Standard View**, then back; your page position must be preserved.
   - Click **Download PDF** and open the downloaded file (Arabic RTL, correct page order).
   - Select multiple summaries and use **Download all** to verify the ZIP archive.
6. Open **Hall of Fame** and **My Achievements**.
   - Check points, medals, badges, participation log, and published summaries.

### B. Summary Editor — log in with `STU1004`

1. Open **League**.
2. Expected navigation: League tabs plus **"المراجعة"** (not the full "الإدارة" console).
3. Open the review queue.
4. Confirm the editor can add a suggestion but **cannot** approve results, publish a summary, or access finance/roles/audit.

### C. Group Admin — log in with `ADMIN-404`

1. Open **League → الإدارة → النتائج والاعتماد**.
2. Select **"المحاضرة 1: البروتين في علائق الدواجن"** (pending approval).
   - Expected: a first-place tie; the tie-breaker shows historical votes in other subjects.
   - The seeded scenario is a **persistent tie**: both first-place students have 7 historical votes, so the result is **"مركز أول مشترك"**.
   - Approve the results, choosing a rule for the next position.
   - Expected after approval: author identities revealed, both joint winners receive **+3 points**, prize status **"معلقة"**.
3. Open **المالية والجوائز**.
   - Select the same competition.
   - Confirm the participant payment table and total prize.
   - Record the joint settlement: amount, recipients, notes (notes are mandatory).
   - Expected: prize becomes **"مسلمة"** and the settlement appears in the ledger.
4. Open **الأدوار والشارات**.
   - Grant/revoke `Summary Contributor` and appoint/remove `Summary Editor`.
   - Expected: a reason is required and an audit entry is created.
5. Open **مراجعة الملخصات**.
   - To test publishing, first log in as a joint winner (`STU1002` or `STU1004`), open the approved competition, and use **"رفع ونشر الملخص الفائز"**. Then return as admin and publish it.
   - Expected: the attribution card is locked and cannot be edited; the summary appears in the library.
6. Open **سجل التدقيق**.
   - Confirm entries for approval, settlement, role changes, and publishing.
7. Open **العام والأرشيف**.
   - Optional: close the academic year and verify **404 Annual Champion** and the archived leaderboard.
   - Use **Reset demo data** afterwards if you want the original seed back.

### D. Mobile check

Use a phone or devtools at ~390px width:
- League tabs wrap and remain accessible.
- Competition cards stack.
- Book Reader shows one page at a time, with touch-friendly controls.
- Bottom navigation and PDF/ZIP downloads work.

### E. Access checks

- Open the site in a private window: the public site must load without Vercel login.
- Direct deployment URLs (`study-league-404-*.vercel.app`) may require Vercel login; share the production alias only.

---

## 5. Acceptance checklist

- [ ] Login works with all demo roles and codes.
- [ ] Voting is anonymous, limited to 3 distinct summaries, and permanently locks.
- [ ] Self-voting is blocked and own summary is marked.
- [ ] Vote tallies are hidden until approval.
- [ ] Submission phase hides other students' summaries.
- [ ] Joint tie produces two first-place winners, 3 points each, and a held prize.
- [ ] Manual joint settlement is recorded with notes and appears in the ledger.
- [ ] Book Reader opens by default; two pages on desktop, one on mobile.
- [ ] Standard View preserves reading position.
- [ ] Attribution cannot be removed or edited.
- [ ] Individual PDF and bulk ZIP downloads work.
- [ ] Editor can only review; cannot publish.
- [ ] Audit log records sensitive actions.
- [ ] Mobile layout is usable.

---

## 6. Known limitations

1. **No backend or database.** Data is stored in each browser's `localStorage`; different devices do not share state.
2. **No real authentication.** Demo codes identify a role/student; they are not secure credentials.
3. **No real payments.** Contribution payment is simulated; no gateway integration.
4. **File storage is local.** Uploaded images are stored as data URLs; browser storage limits apply (~5 MB). Large uploads may fail or reduce capacity.
5. **Anonymity is enforced in the UI/service layer**, not by a server or cryptographic separation. A determined user with developer tools could inspect local data.
6. **PDF/ZIP generation runs in the browser.** Very large collections may be slow, and the tab must stay open.
7. **No email/SMS notifications.** Notifications are in-app only.
8. **Single demo group.** Cross-group isolation is modeled but not exercised.
9. **Hobby Vercel plan.** Team collaboration is unavailable; 2FA is strongly recommended.
10. **No custom domain** is configured.

Production would require: API + database, server-side authorization, private object storage with signed URLs, real payment integration, background jobs for PDF generation, scheduled notifications, and automated tests against the API.

---

## 7. Ownership, access & security

- The Vercel project and `study-league-404.vercel.app` are now under your team **404** (`team404m-3066`).
- The source repository is public at https://github.com/yahyaayman111/study-league-404.
- The project is **not connected to Git** yet. To enable automatic deployments, fork the repository to your GitHub account and use **Connect Git** in Vercel, or deploy with the Vercel CLI from your account.
- **Rotate the temporary Gmail password** shared during setup and enable Google 2FA. Also enable Vercel 2FA.
- Do not share the production alias with people who should not access the demo; direct preview URLs are protected, but the production alias is public.
- If you need the GitHub repository transferred to your account, provide your GitHub username.

---

## 8. Suggested next phase

1. Backend + database (PostgreSQL/Supabase) with unique vote constraints.
2. Real student authentication (student code + group code + admin accounts).
3. Private file storage and signed upload/download URLs.
4. Payment gateway and reconciliation for the 10 EGP contributions.
5. Server-side PDF generation and bulk exports.
6. Scheduled notifications (submission deadline, voting start/end).
7. Multi-group isolation and platform-wide analytics.
8. End-to-end and load testing before real student data.

---

## 9. Sign-off

| Item | Status |
| --- | --- |
| Production deployment | Ready |
| Demo accounts | Working |
| Rule test suite | 19/19 passed |
| PDF/ZIP downloads | Verified |
| Mobile layout | Verified |
| Ownership transfer | Complete |
| Client testing | Pending your review |

Please reply with any issues found during the test plan, including the role, page, and steps to reproduce.
