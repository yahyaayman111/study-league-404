import assert from "node:assert/strict";
import { createSeed, rankCompetition, anonymousSubmissions, can } from "../src/league/domain.js";
import { castVotes } from "../src/league/services/voting.js";
import { approveResults, closeAcademicYear } from "../src/league/services/results.js";
import { settleJointPrize, markPayment } from "../src/league/services/finance.js";
import { publishEntry, submitWinningSummary } from "../src/league/services/library.js";
import { submitSummary, advanceStatus } from "../src/league/services/competitions.js";
import { grantContributor } from "../src/league/services/roles.js";

const clone = (v) => JSON.parse(JSON.stringify(v));
const base = createSeed([], []);
const student = (id, extra = {}) => ({ kind: "student", studentId: id, name: `student-${id}`, ...extra });
const admin = (kind = "group_admin") => ({ kind, name: "admin" });
const expectFail = (fn, fragment) => {
  let message = "";
  try { fn(); } catch (e) { message = e.message; }
  assert.ok(message, "expected a failure");
  if (fragment) assert.ok(message.includes(fragment), `unexpected message: ${message}`);
};

let pass = 0;
const test = (name, fn) => {
  try { fn(); pass += 1; console.log("✓", name); }
  catch (e) { console.error("✗", name, "—", e.message); process.exitCode = 1; }
};

test("seed exposes 8 competitions including the tie-break history", () => {
  assert.equal(base.competitions.length, 8);
  assert.ok(base.competitions.some((c) => c.id === "c8"));
});

test("anonymous projection strips names/codes and uses neutral labels", () => {
  const anon = anonymousSubmissions(base.competitions.find((c) => c.id === "c2").submissions);
  assert.ok(anon.length === 5);
  assert.ok(anon.every((s) => !("name" in s) && !("code" in s) && !("authorName" in s)));
  assert.deepEqual(anon.map((s) => s.label), anon.map((_, i) => `ملخص مشارك #${i + 1}`));
});

test("c5 persistent tie resolves to joint first with 7 historical votes each", () => {
  const c = base.competitions.find((x) => x.id === "c5");
  const r = rankCompetition(base, c);
  assert.equal(r.jointFirst, true);
  const first = r.ranking.filter((x) => x.rank === 1);
  assert.equal(first.length, 2);
  assert.deepEqual(first.map((x) => x.studentId).sort(), [2, 4]);
  assert.ok(first.every((x) => x.points === 3 && x.historical === 7));
});

test("up to 3 distinct votes, with unused votes allowed", () => {
  const d = clone(base);
  const c2 = d.competitions.find((c) => c.id === "c2");
  const others = c2.submissions.filter((s) => s.studentId !== 1).slice(0, 2).map((s) => s.id);
  castVotes(d, "c2", others, { session: student(1) });
  assert.equal(c2.votes.filter((v) => v.voterId === 1).length, 2);
  assert.equal(c2.voteLocks.filter((l) => l.voterId === 1).length, 1);
  expectFail(() => castVotes(d, "c2", [others[0]], { session: student(1) }), "تم تثبيت أصواتك");
});

test("self-vote is rejected", () => {
  const d = clone(base);
  expectFail(() => castVotes(d, "c2", ["c2_s1"], { session: student(1) }), "ملخصك الخاص");
});

test("more than 3 votes rejected", () => {
  const d = clone(base);
  const c2 = d.competitions.find((c) => c.id === "c2");
  const ids = c2.submissions.filter((s) => s.studentId !== 1).map((s) => s.id);
  expectFail(() => castVotes(d, "c2", ids, { session: student(1) }), "ثلاثة أصوات");
});

test("duplicate summary in one ballot rejected", () => {
  const d = clone(base);
  expectFail(() => castVotes(d, "c2", ["c2_s2", "c2_s2"], { session: student(1) }), "نفسه أكثر من مرة");
});

test("unpaid participant cannot vote", () => {
  const d = clone(base);
  const c2 = d.competitions.find((c) => c.id === "c2");
  c2.participants.find((p) => p.studentId === 1).paymentStatus = "UNPAID";
  expectFail(() => castVotes(d, "c2", ["c2_s2"], { session: student(1) }), "سداد المساهمة");
});

test("voting after the deadline rejected", () => {
  const d = clone(base);
  const c2 = d.competitions.find((c) => c.id === "c2");
  c2.votingEnd = new Date(Date.now() - 1000).toISOString();
  expectFail(() => castVotes(d, "c2", ["c2_s2"], { session: student(1) }), "فترة التصويت");
});

test("admins cannot cast student votes", () => {
  const d = clone(base);
  expectFail(() => castVotes(d, "c2", ["c2_s2"], { session: admin() }), "لا تملك الصلاحية");
});

test("submission after the deadline rejected", () => {
  const d = clone(base);
  const c3 = d.competitions.find((c) => c.id === "c3");
  c3.submissionDeadline = new Date(Date.now() - 1000).toISOString();
  expectFail(() => submitSummary(d, "c3", { images: ["data:image/png;base64,AAA"] }, { session: student(1) }), "انتهت مهلة");
});

test("only admins can approve results; admin approves the joint tie", () => {
  const d = clone(base);
  expectFail(() => approveResults(d, "c5", { session: student(1), nextPositionRule: "third" }), "لا تملك الصلاحية");
  approveResults(d, "c5", { session: admin(), nextPositionRule: "third" });
  const c5 = d.competitions.find((c) => c.id === "c5");
  assert.equal(c5.status, "COMPLETED");
  assert.equal(c5.results.jointFirst, true);
  assert.deepEqual(c5.results.prize.winnerIds.slice().sort(), [2, 4]);
  assert.equal(c5.results.prize.status, "ON_HOLD_FOR_JOINT_WINNER_AGREEMENT");
  const first = c5.results.ranking.filter((r) => r.rank === 1);
  assert.ok(first.every((r) => r.points === 3));
  assert.equal(d.pointsLedger.filter((p) => p.competitionId === "c5" && p.rank === 1).length, 2);
  expectFail(() => approveResults(d, "c5", { session: admin(), nextPositionRule: "third" }), "مسبقاً");
});

test("joint prize needs a manual settlement with notes", () => {
  const d = clone(base);
  approveResults(d, "c5", { session: admin(), nextPositionRule: "third" });
  expectFail(() => settleJointPrize(d, "c5", { amount: 60, notes: "", recipients: [2, 4] }, { session: admin() }), "ملاحظات");
  settleJointPrize(d, "c5", { amount: 60, notes: "اتفاق متبادل", recipients: [2, 4], date: "2026-11-25" }, { session: admin() });
  const prize = d.competitions.find((c) => c.id === "c5").results.prize;
  assert.equal(prize.status, "DELIVERED");
  assert.equal(prize.settlements.length, 1);
  assert.equal(prize.settlements[0].amount, 60);
});

test("only winning summaries can be submitted; publication is admin-only", () => {
  const d = clone(base);
  expectFail(() => submitWinningSummary(d, "c1", { title: "x", text: "y" }, { session: student(3) }), "المركز الأول");
  submitWinningSummary(d, "c8", { title: "نسخة رقمية للاختبار", text: "## عنوان\nنص" }, { session: student(4) });
  const entry = d.library.find((e) => e.competitionId === "c8" && e.status === "PENDING_REVIEW");
  assert.ok(entry);
  expectFail(() => publishEntry(d, entry.id, { session: student(4) }), "لا تملك الصلاحية");
  publishEntry(d, entry.id, { session: admin() });
  assert.equal(entry.status, "PUBLISHED");
  assert.equal(entry.attribution.locked, true);
  assert.equal(entry.attribution.authorName, "سلمى حسن");
});

test("editor role can review but cannot publish; contributor badge grants nothing", () => {
  const editor = student(4, { isEditor: true });
  assert.equal(can(editor, "summary.review"), true);
  assert.equal(can(editor, "summary.publish"), false);
  assert.equal(can(editor, "results.approve"), false);
  const contributor = base.students.find((s) => s.badges.some((b) => b.badgeId === "summary_contributor"));
  assert.ok(contributor);
  assert.equal(can({ kind: "student", studentId: contributor.id, name: contributor.name }, "summary.publish"), false);
});

test("student cannot grant roles; admin needs a reason", () => {
  const d = clone(base);
  expectFail(() => grantContributor(d, 3, "سبب", { session: student(1) }), "لا تملك الصلاحية");
  expectFail(() => grantContributor(d, 3, "   ", { session: admin() }), "سبب");
  grantContributor(d, 3, "ملخص معتمد", { session: admin() });
  assert.ok(d.students.find((s) => s.id === 3).badges.some((b) => b.badgeId === "summary_contributor"));
});

test("completed competitions cannot advance status again", () => {
  const d = clone(base);
  expectFail(() => advanceStatus(d, "c1", { session: admin() }), "لا توجد مرحلة تالية");
});

test("academic year closes once and awards the Annual Champion badge", () => {
  const d = clone(base);
  closeAcademicYear(d, { session: admin() });
  assert.ok(d.annualChampions.some((c) => c.yearId === d.currentYearId));
  const champion = d.annualChampions.find((c) => c.yearId === d.currentYearId);
  assert.ok(d.students.find((s) => s.id === champion.championId).badges.some((b) => b.badgeId === "annual_champion"));
  expectFail(() => closeAcademicYear(d, { session: admin() }), "مسبقاً");
});

test("financial privacy: only finance admins can mark payments", () => {
  const d = clone(base);
  const c2 = d.competitions.find((c) => c.id === "c2");
  c2.participants.find((p) => p.studentId === 1).paymentStatus = "UNPAID";
  expectFail(() => markPayment(d, "c2", 1, "PAID", { session: student(1) }), "لا تملك الصلاحية");
  markPayment(d, "c2", 1, "PAID", { session: admin() });
  assert.equal(c2.participants.find((p) => p.studentId === 1).paymentStatus, "PAID");
});

console.log(`\n${pass} rule tests passed`);
