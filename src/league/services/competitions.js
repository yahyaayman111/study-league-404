import { NEXT_STATUS, STATUS, uid } from "../domain.js";
import { fail, findComp, log, notify, notifyGroup, requirePerm, requireStatus, withinWindow } from "./common.js";

function validateDates({ startDate, submissionDeadline, votingStart, votingEnd }) {
  const s = new Date(startDate).getTime();
  const sd = new Date(submissionDeadline).getTime();
  const vs = new Date(votingStart).getTime();
  const ve = new Date(votingEnd).getTime();
  if (![s, sd, vs, ve].every(Number.isFinite)) fail("يرجى إدخال تواريخ صحيحة لجميع المراحل.");
  if (!(s < sd && sd <= vs && vs < ve)) {
    fail("ترتيب التواريخ غير صحيح: يجب أن يبدأ التقديم قبل إغلاقه، ثم يبدأ التصويت وينتهي بعده.");
  }
}

function statusForDates(startDate, submissionDeadline) {
  const now = Date.now();
  if (now < new Date(startDate).getTime()) return "UPCOMING";
  if (now < new Date(submissionDeadline).getTime()) return "SUBMISSION_OPEN";
  return "VOTING_OPEN";
}

export function createCompetition(draft, payload, ctx) {
  requirePerm(ctx.session, "competition.create");
  const subject = draft.subjects.find((s) => s.id === Number(payload.subjectId));
  if (!subject) fail("يرجى اختيار مادة دراسية موجودة.");
  if (!payload.title?.trim()) fail("عنوان المسابقة أو اسم المحاضرة مطلوب.");
  const fee = Number(payload.fee ?? 10);
  if (!Number.isFinite(fee) || fee < 0) fail("قيمة المساهمة يجب أن تكون رقماً غير سالب.");
  validateDates(payload);
  const comp = {
    id: uid("c"),
    subjectId: subject.id,
    groupId: draft.group.id,
    title: payload.title.trim(),
    instructions: (payload.instructions || "").trim(),
    startDate: payload.startDate,
    submissionDeadline: payload.submissionDeadline,
    votingStart: payload.votingStart,
    votingEnd: payload.votingEnd,
    fee,
    status: statusForDates(payload.startDate, payload.submissionDeadline),
    createdAt: new Date().toISOString(),
    participants: [],
    submissions: [],
    votes: [],
    voteLocks: [],
    results: null,
  };
  draft.competitions.unshift(comp);
  notifyGroup(draft, "مسابقة أسبوعية جديدة", `${subject.name}: ${comp.title}. سارع بالانضمام قبل إغلاق التقديم.`, { tab: "competitions", competitionId: comp.id });
  log(draft, ctx.session, "إنشاء مسابقة", comp.id, null, { title: comp.title, subjectId: comp.subjectId, fee, status: comp.status });
  return { message: "تم إنشاء المسابقة ونشرها لطلاب المجموعة." };
}

export function updateCompetition(draft, compId, payload, ctx) {
  requirePerm(ctx.session, "competition.manage");
  const comp = findComp(draft, compId);
  if (comp.results) fail("لا يمكن تعديل مسابقة معتمدة النتائج. استخدم تعديل النتيجة مع سبب موثق.");
  const next = {
    ...comp,
    title: payload.title?.trim() || comp.title,
    instructions: (payload.instructions ?? comp.instructions).trim(),
    subjectId: Number(payload.subjectId || comp.subjectId),
    startDate: payload.startDate || comp.startDate,
    submissionDeadline: payload.submissionDeadline || comp.submissionDeadline,
    votingStart: payload.votingStart || comp.votingStart,
    votingEnd: payload.votingEnd || comp.votingEnd,
    fee: Number(payload.fee ?? comp.fee),
  };
  validateDates(next);
  if (!draft.subjects.some((s) => s.id === next.subjectId)) fail("المادة المختارة غير موجودة.");
  const before = { title: comp.title, startDate: comp.startDate, submissionDeadline: comp.submissionDeadline, votingEnd: comp.votingEnd, fee: comp.fee };
  Object.assign(comp, {
    title: next.title, instructions: next.instructions, subjectId: next.subjectId,
    startDate: next.startDate, submissionDeadline: next.submissionDeadline,
    votingStart: next.votingStart, votingEnd: next.votingEnd, fee: next.fee,
  });
  log(draft, ctx.session, "تعديل مسابقة", comp.id, before, {
    title: comp.title, startDate: comp.startDate, submissionDeadline: comp.submissionDeadline, votingEnd: comp.votingEnd, fee: comp.fee,
  });
  return { message: "تم تحديث بيانات المسابقة." };
}

export function advanceStatus(draft, compId, ctx) {
  requirePerm(ctx.session, "competition.manage");
  const comp = findComp(draft, compId);
  const next = NEXT_STATUS[comp.status];
  if (!next) fail("لا توجد مرحلة تالية لهذه المسابقة.");
  if (next === "COMPLETED") fail("الانتقال إلى «معتمدة» يتم فقط من خلال اعتماد النتائج النهائية.");
  if (next === "PENDING_APPROVAL" && comp.votes.length === 0) fail("لا يمكن إغلاق التصويت قبل تسجيل أي أصوات.");
  const before = comp.status;
  comp.status = next;
  if (next === "PENDING_APPROVAL") {
    comp.votingEnd = comp.votingEnd && new Date(comp.votingEnd) < new Date() ? comp.votingEnd : new Date().toISOString();
    notify(draft, "group_admin", "نتائج بانتظار الاعتماد", `${comp.title}: انتهى التصويت والنتائج جاهزة للمراجعة.`, { tab: "admin", competitionId: comp.id });
  }
  if (next === "VOTING_OPEN") {
    notifyGroup(draft, "بداية التصويت", `${comp.title}: أصبحت الملخصات متاحة للقراءة والتصويت. لديك حتى 3 أصوات.`, { tab: "competitions", competitionId: comp.id });
  }
  log(draft, ctx.session, "تغيير حالة المسابقة", comp.id, before, next);
  return { message: `تم نقل المسابقة إلى مرحلة «${STATUS[next].ar}».` };
}

export function joinCompetition(draft, compId, ctx) {
  requirePerm(ctx.session, "competition.join");
  const comp = findComp(draft, compId);
  const studentId = Number(ctx.session.studentId);
  if (!studentId) fail("يجب تسجيل الدخول بحساب طالب للانضمام.");
  if (comp.status !== "UPCOMING" && comp.status !== "SUBMISSION_OPEN") {
    fail("باب الانضمام مغلق في هذه المرحلة.");
  }
  if (Date.now() > new Date(comp.submissionDeadline).getTime()) fail("انتهى موعد الانضمام والتقديم.");
  if (comp.participants.some((p) => p.studentId === studentId)) fail("أنت مسجل بالفعل في هذه المسابقة.");
  comp.participants.push({ studentId, paymentStatus: "UNPAID", paidAt: null, verifiedBy: null });
  notify(draft, "group_admin", "انضمام جديد لمسابقة", `${ctx.session.name} انضم إلى مسابقة «${comp.title}».`, { tab: "admin", competitionId: comp.id });
  return { message: "تم تسجيلك. يرجى سداد المساهمة لتأكيد المشاركة." };
}

export function payContribution(draft, compId, ctx) {
  requirePerm(ctx.session, "competition.join");
  const comp = findComp(draft, compId);
  const studentId = Number(ctx.session.studentId);
  const p = comp.participants.find((x) => x.studentId === studentId);
  if (!p) fail("يجب الانضمام إلى المسابقة أولاً.");
  if (p.paymentStatus === "PAID") fail("المساهمة مسجلة كمدفوعة بالفعل.");
  p.paymentStatus = "PAID";
  p.paidAt = new Date().toISOString();
  p.verifiedBy = null;
  notify(draft, "group_admin", "مساهمة جديدة بانتظار التحقق", `${ctx.session.name} سدد ${comp.fee} ج.م في مسابقة «${comp.title}».`, { tab: "admin", competitionId: comp.id });
  log(draft, ctx.session, "تسجيل مساهمة", `payment:${comp.id}:${studentId}`, "UNPAID", "PAID", "دفع تجريبي من الطالب");
  return { message: "تم تسجيل المساهمة. سيؤكدها مدير المجموعة." };
}

export function submitSummary(draft, compId, payload, ctx) {
  requirePerm(ctx.session, "submission.upload");
  const comp = findComp(draft, compId);
  const studentId = Number(ctx.session.studentId);
  requireStatus(comp, "SUBMISSION_OPEN", "تقديم الملخص");
  withinWindow(comp.submissionDeadline, "مهلة تقديم الملخصات");
  const p = comp.participants.find((x) => x.studentId === studentId);
  if (!p) fail("يجب الانضمام إلى المسابقة قبل تقديم الملخص.");
  if (p.paymentStatus !== "PAID") fail("يجب سداد المساهمة (10 ج.م) قبل تقديم الملخص.");
  const images = Array.isArray(payload.images) ? payload.images : [];
  if (!images.length) fail("أرفق صورة واحدة على الأقل من الملخص بخط اليد.");
  if (images.length > 6) fail("الحد الأقصى 6 صور للملخص الواحد.");
  for (const img of images) {
    if (typeof img !== "string" || !img.startsWith("data:image/")) fail("صيغة الصورة غير مدعومة.");
    if (img.length > 4_500_000) fail("حجم الصورة كبير جداً (الحد 3 ميجابايت تقريباً).");
  }
  const existing = comp.submissions.find((s) => s.studentId === studentId);
  if (existing) {
    existing.images = images;
    existing.notes = (payload.notes || "").trim();
    existing.submittedAt = new Date().toISOString();
    existing.replacedAt = new Date().toISOString();
    return { message: "تم استبدال ملخصك بنجاح قبل انتهاء المهلة." };
  }
  comp.submissions.push({
    id: uid("s"), competitionId: comp.id, studentId,
    images, notes: (payload.notes || "").trim(), submittedAt: new Date().toISOString(),
  });
  notify(draft, "group_admin", "ملخص جديد مرفوع", `${ctx.session.name} قدّم ملخصاً في «${comp.title}».`, { tab: "admin", competitionId: comp.id });
  return { message: "تم رفع الملخص. لن يظهر للطلاب إلا بعد فتح التصويت." };
}

export function sendDeadlineReminder(draft, compId, ctx) {
  requirePerm(ctx.session, "competition.manage");
  const comp = findComp(draft, compId);
  if (comp.status !== "SUBMISSION_OPEN") fail("التذكير متاح فقط أثناء فترة التقديم.");
  const missing = comp.participants.filter((p) => !comp.submissions.some((s) => s.studentId === p.studentId));
  for (const p of missing) {
    notify(draft, `student:${p.studentId}`, "تذكير: اقترب موعد إغلاق التقديم", `${comp.title}: تبقّى ${Math.max(0, Math.ceil((new Date(comp.submissionDeadline) - Date.now()) / 3600000))} ساعة لتقديم ملخصك.`, { tab: "competitions", competitionId: comp.id });
  }
  log(draft, ctx.session, "إرسال تذكير التقديم", comp.id, null, `${missing.length} طالب`);
  return { message: `تم إرسال التذكير إلى ${missing.length} طالباً لم يقدموا ملخصاتهم.` };
}
