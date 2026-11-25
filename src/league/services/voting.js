import { uid } from "../domain.js";
import { fail, findComp, log, notify, requirePerm, requireStatus, withinWindow } from "./common.js";

export function castVotes(draft, compId, submissionIds, ctx) {
  requirePerm(ctx.session, "vote.cast");
  const comp = findComp(draft, compId);
  const voterId = Number(ctx.session.studentId);
  if (!voterId) fail("يجب تسجيل الدخول بحساب طالب للتصويت.");
  requireStatus(comp, "VOTING_OPEN", "التصويت");
  withinWindow(comp.votingEnd, "فترة التصويت");
  if (Date.now() < new Date(comp.votingStart).getTime()) fail("لم تبدأ فترة التصويت بعد.");

  const p = comp.participants.find((x) => x.studentId === voterId);
  if (!p) fail("التصويت متاح للمشاركين المسجلين في المسابقة فقط.");
  if (p.paymentStatus !== "PAID") fail("يجب سداد المساهمة قبل التصويت.");
  if (comp.voteLocks.some((l) => l.voterId === voterId)) fail("تم تثبيت أصواتك مسبقاً ولا يمكن تعديلها أو سحبها.");
  if (comp.votes.some((v) => v.voterId === voterId)) fail("لديك أصوات مسجلة بالفعل.");

  const ids = [...new Set((submissionIds || []).map(String))];
  if (ids.length !== (submissionIds || []).length) fail("لا يمكن اختيار الملخص نفسه أكثر من مرة.");
  if (ids.length < 1) fail("اختر ملخصاً واحداً على الأقل، أو امتنع عن التصويت تماماً.");
  if (ids.length > 3) fail("الحد الأقصى ثلاثة أصوات فقط.");

  for (const id of ids) {
    const sub = comp.submissions.find((s) => s.id === id);
    if (!sub) fail("أحد الملخصات المختارة غير موجود في هذه المسابقة.");
    if (sub.studentId === voterId) fail("لا يمكنك التصويت لملخصك الخاص.");
  }

  const existing = new Set(comp.votes.filter((v) => v.voterId === voterId).map((v) => v.submissionId));
  if (ids.some((id) => existing.has(id))) fail("تم تسجيل صوت لهذا الملخص مسبقاً.");

  for (const id of ids) {
    comp.votes.push({ id: uid("v"), competitionId: comp.id, voterId, submissionId: id, createdAt: new Date().toISOString() });
  }
  comp.voteLocks.push({ voterId, lockedAt: new Date().toISOString() });
  log(draft, ctx.session, "تثبيت أصوات", comp.id, null, { count: ids.length }, "تأكيد نهائي من الطالب");
  notify(draft, `student:${voterId}`, "تم تثبيت تصويتك", `سجلت ${ids.length} من 3 أصوات في «${comp.title}». لا يمكن تعديلها بعد الآن.`, { tab: "competitions", competitionId: comp.id });
  return { message: `تم تثبيت ${ids.length} من 3 أصوات بنجاح. لا يمكن التعديل بعد التأكيد.` };
}

export function deadlineGuard(comp) {
  if (Date.now() > new Date(comp.votingEnd).getTime()) fail("انتهت فترة التصويت ولا يمكن تنفيذ العملية.");
}
