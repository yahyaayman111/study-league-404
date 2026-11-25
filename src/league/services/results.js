import { rankCompetition, prizePool, uid } from "../domain.js";
import { awardBadge, fail, findComp, log, notify, notifyGroup, requirePerm, requireStatus } from "./common.js";

function normalizeJointRanking(ranking, jointFirst, rule) {
  if (!jointFirst) return ranking;
  const jointRows = ranking.filter((r) => r.joint);
  const rest = ranking.filter((r) => !r.joint);
  let nextRank = rule === "second" ? 2 : 3;
  return [
    ...jointRows.map((r) => ({ ...r, rank: 1, points: 3 })),
    ...rest.map((r) => {
      const rank = nextRank;
      const points = rank === 2 ? 2 : rank === 3 ? 1 : 0;
      nextRank += 1;
      return { ...r, rank, points, joint: false };
    }),
  ];
}

export function approveResults(draft, compId, ctx) {
  requirePerm(ctx.session, "results.approve");
  const comp = findComp(draft, compId);
  if (comp.results) fail("تم اعتماد نتائج هذه المسابقة مسبقاً. لا يمكن الاعتماد مرتين.");
  requireStatus(comp, "PENDING_APPROVAL", "اعتماد النتائج");
  if (!comp.votes.length) fail("لا توجد أصوات لاعتماد نتائجها.");

  const computed = rankCompetition(draft, comp);
  if (!computed.ranking.length) fail("تعذر حساب النتائج: لا توجد مشاركات صالحة.");
  const rule = ctx.nextPositionRule === "second" ? "second" : "third";
  const ranking = normalizeJointRanking(computed.ranking, computed.jointFirst, rule);

  const winners = ranking.filter((r) => r.rank === 1).map((r) => r.studentId);
  const total = prizePool(comp);
  comp.results = {
    approvedAt: new Date().toISOString(),
    approvedBy: ctx.session.name,
    jointFirst: computed.jointFirst,
    tieNotes: computed.tieNotes || "لا يوجد تعادل على المركز الأول.",
    historical: computed.historical || {},
    nextPositionRule: rule,
    ranking,
    prize: {
      total,
      status: computed.jointFirst ? "ON_HOLD_FOR_JOINT_WINNER_AGREEMENT" : "PENDING",
      winnerIds: winners,
      deliveredAt: null,
      settlements: [],
      notes: computed.jointFirst
        ? "المركز الأول مشترك: تُترك الجائزة معلقة حتى يتفق الفائزان مع الإدارة، ثم يسجل المدير التسوية يدوياً."
        : "تستحق الجائزة كاملة للفائز الأول وتُسجل عند التسليم.",
    },
  };
  comp.status = "COMPLETED";

  for (const row of ranking) {
    if (!row.points) continue;
    const dup = draft.pointsLedger.some((p) => p.competitionId === comp.id && p.studentId === row.studentId);
    if (!dup) {
      draft.pointsLedger.push({
        id: uid("pts"), studentId: row.studentId, competitionId: comp.id,
        subjectId: comp.subjectId, yearId: draft.currentYearId, rank: row.rank,
        points: row.points, createdAt: new Date().toISOString(),
      });
    }
    const student = draft.students.find((s) => s.id === row.studentId);
    if (!student) continue;
    if (row.rank === 1) {
      awardBadge(draft, ctx.session, student.id, "weekly_champion", `المركز الأول في ${comp.title}`, true);
      notify(draft, `student:${student.id}`, "مبروك! المركز الأول", `حصلت على المركز الأول${row.joint ? " (مشترك)" : ""} في «${comp.title}».`, { tab: "competitions", competitionId: comp.id });
    } else if (row.rank === 2) {
      notify(draft, `student:${student.id}`, "المركز الثاني", `حصلت على المركز الثاني في «${comp.title}».`, { tab: "competitions", competitionId: comp.id });
    } else if (row.rank === 3) {
      notify(draft, `student:${student.id}`, "المركز الثالث", `حصلت على المركز الثالث في «${comp.title}».`, { tab: "competitions", competitionId: comp.id });
    }
    notify(draft, `student:${student.id}`, "تحديث رصيد النقاط", `أضيف ${row.points} نقاط إلى رصيدك السنوي.`, { tab: "achievements" });
  }

  for (const s of draft.students) {
    const approvedSubs = draft.competitions
      .filter((c) => c.results)
      .filter((c) => c.submissions.some((sub) => sub.studentId === s.id)).length;
    if (approvedSubs >= 3) awardBadge(draft, ctx.session, s.id, "consistent_contributor", "ملخصات في 3 مسابقات معتمدة", true);
  }

  notifyGroup(draft, "اعتماد النتائج النهائية", `تم الإعلان عن نتائج «${comp.title}». شاهد الترتيب والملخصات الفائزة.`, { tab: "competitions", competitionId: comp.id });
  log(draft, ctx.session, "اعتماد النتائج", comp.id, "PENDING_APPROVAL", {
    status: "COMPLETED", jointFirst: computed.jointFirst, winnerIds: winners, prize: comp.results.prize.status,
  }, computed.tieNotes);
  return { message: computed.jointFirst ? "تم اعتماد النتائج: مركز أول مشترك، والجائزة معلقة بانتظار الاتفاق." : "تم اعتماد النتائج وإضافة النقاط وإعلان الفائز." };
}

export function adjustPoints(draft, compId, studentId, points, reason, ctx) {
  requirePerm(ctx.session, "results.approve");
  const comp = findComp(draft, compId);
  if (!comp.results) fail("لا يمكن تعديل نقاط مسابقة غير معتمدة.");
  if (!reason?.trim()) fail("سبب التعديل مطلوب وإلزامي.");
  const value = Number(points);
  if (!Number.isFinite(value) || value === 0 || value > 3 || value < -3) fail("قيمة التعديل يجب أن تكون بين -3 و+3 وليست صفراً.");
  const student = draft.students.find((s) => s.id === Number(studentId));
  if (!student) fail("الطالب غير موجود.");
  draft.pointsLedger.push({
    id: uid("adj"), studentId: student.id, competitionId: comp.id, subjectId: comp.subjectId,
    yearId: draft.currentYearId, rank: 0, points: value, createdAt: new Date().toISOString(),
    adjustment: true, reason: reason.trim(),
  });
  log(draft, ctx.session, "تعديل نقاط بعد الاعتماد", `${comp.id}:${student.id}`, null, value, reason.trim());
  notify(draft, `student:${student.id}`, "تعديل رصيد النقاط", `أضيف تعديل ${value > 0 ? "+" : ""}${value} نقاط على رصيدك. السبب: ${reason.trim()}`, { tab: "achievements" });
  return { message: "تم تسجيل تعديل النقاط في السجل مع السبب." };
}

export function closeAcademicYear(draft, ctx) {
  requirePerm(ctx.session, "year.close");
  if (draft.annualChampions.some((c) => c.yearId === draft.currentYearId)) fail("تم إغلاق هذا العام الدراسي وأرشفته مسبقاً.");
  if (draft.yearClosed) fail("العام الدراسي مغلق بالفعل.");
  const rows = draft.students.map((s) => {
    const pts = draft.pointsLedger.filter((p) => p.studentId === s.id && p.yearId === draft.currentYearId).reduce((a, p) => a + p.points, 0);
    return { id: s.id, points: pts };
  }).sort((a, b) => b.points - a.points);
  const champion = rows[0];
  if (!champion) fail("لا يوجد طلاب لحساب بطل العام.");
  draft.annualChampions.unshift({
    yearId: draft.currentYearId,
    championId: champion.id,
    points: champion.points,
    archivedAt: new Date().toISOString(),
    top: rows.slice(0, 3).map((r) => r.id),
  });
  draft.yearClosed = true;
  awardBadge(draft, ctx.session, champion.id, "annual_champion", `بطل العام الدراسي ${draft.year.label}`, true);
  notifyGroup(draft, "إغلاق العام الدراسي", `تم تتويج ${draft.students.find((s) => s.id === champion.id)?.name} بلقب 404 Annual Champion برصيد ${champion.points} نقطة.`, { tab: "hall" });
  log(draft, ctx.session, "إغلاق العام الدراسي", draft.currentYearId, null, { championId: champion.id, points: champion.points });
  return { message: "تم إغلاق العام وأرشفة الترتيب وتتويج 404 Annual Champion." };
}
