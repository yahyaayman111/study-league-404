import { prizePool } from "../domain.js";
import { fail, findComp, findStudent, log, notify, requirePerm } from "./common.js";

export function markPayment(draft, compId, studentId, status, ctx) {
  requirePerm(ctx.session, "finance.manage");
  const comp = findComp(draft, compId);
  const p = comp.participants.find((x) => x.studentId === Number(studentId));
  if (!p) fail("الطالب غير مسجل في هذه المسابقة.");
  const student = findStudent(draft, studentId);
  const next = status === "PAID" ? "PAID" : "UNPAID";
  if (p.paymentStatus === next) fail("حالة السداد محدثة بالفعل.");
  const before = p.paymentStatus;
  p.paymentStatus = next;
  p.paidAt = next === "PAID" ? new Date().toISOString() : null;
  p.verifiedBy = next === "PAID" ? ctx.session.name : null;
  log(draft, ctx.session, next === "PAID" ? "تأكيد سداد مساهمة" : "إلغاء سداد مساهمة", `payment:${comp.id}:${student.id}`, before, next);
  notify(draft, `student:${student.id}`, next === "PAID" ? "تم تأكيد مساهمتك" : "تم إلغاء تسجيل المساهمة", `${comp.title}: ${next === "PAID" ? "تم التحقق من سداد المساهمة." : "يرجى مراجعة الإدارة."}`, { tab: "competitions", competitionId: comp.id });
  return { message: `تم تحديث حالة السداد للطالب ${student.name}.` };
}

export function deliverPrize(draft, compId, ctx) {
  requirePerm(ctx.session, "finance.manage");
  const comp = findComp(draft, compId);
  if (!comp.results) fail("لا توجد نتائج معتمدة لهذه المسابقة.");
  const prize = comp.results.prize;
  if (comp.results.jointFirst) fail("هذه المسابقة بمركز أول مشترك: استخدم تسوية الاتفاق المشترك بدلاً من التسليم الفردي.");
  if (prize.status === "DELIVERED") fail("تم تسليم الجائزة مسبقاً.");
  if (prize.status === "ON_HOLD_FOR_JOINT_WINNER_AGREEMENT") fail("الجائزة معلقة بانتظار اتفاق الفائزين.");
  prize.status = "DELIVERED";
  prize.deliveredAt = new Date().toISOString();
  prize.notes = `${prize.notes} — سلّمها ${ctx.session.name}.`.trim();
  const winner = prize.winnerIds[0];
  notify(draft, `student:${winner}`, "تم تسليم الجائزة المالية", `تم تسليم جائزة «${comp.title}» بقيمة ${prize.total} ج.م.`, { tab: "achievements" });
  log(draft, ctx.session, "تسليم جائزة مالية", comp.id, "PENDING", "DELIVERED", `المبلغ ${prize.total} ج.م`);
  return { message: "تم تسجيل تسليم الجائزة في السجل المالي." };
}

export function settleJointPrize(draft, compId, payload, ctx) {
  requirePerm(ctx.session, "finance.manage");
  const comp = findComp(draft, compId);
  if (!comp.results) fail("لا توجد نتائج معتمدة.");
  if (!comp.results.jointFirst) fail("تسوية الاتفاق المشترك متاحة فقط عند وجود مركز أول مشترك.");
  const prize = comp.results.prize;
  if (prize.status === "DELIVERED") fail("تم تسجيل التسوية مسبقاً.");
  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0) fail("أدخل مبلغ التسوية المتفق عليه.");
  if (amount > prize.total) fail(`المبلغ أكبر من إجمالي الجائزة (${prize.total} ج.م).`);
  if (!payload.notes?.trim()) fail("ملاحظات الاتفاق إلزامية لتوثيق التسوية.");
  const recipients = (payload.recipients || []).map(Number).filter((id) => prize.winnerIds.includes(id));
  if (!recipients.length) fail("اختر فائزاً واحداً على الأقل من الفائزين بالمركز الأول المشترك.");
  const settlement = {
    id: `stl_${Date.now()}`,
    amount,
    recipients,
    notes: payload.notes.trim(),
    date: payload.date || new Date().toISOString().slice(0, 10),
    admin: ctx.session.name,
    recordedAt: new Date().toISOString(),
  };
  prize.settlements.push(settlement);
  prize.status = "DELIVERED";
  prize.deliveredAt = new Date().toISOString();
  prize.notes = `تسوية يدوية بعد اتفاق الفائزين: ${settlement.notes}`;
  for (const id of recipients) {
    notify(draft, `student:${id}`, "تسوية جائزة المركز الأول المشترك", `تم تسجيل الاتفاق المالي: ${amount} ج.م. ${settlement.notes}`, { tab: "achievements" });
  }
  log(draft, ctx.session, "تسجيل تسوية جائزة مشتركة", comp.id, "ON_HOLD_FOR_JOINT_WINNER_AGREEMENT", {
    status: "DELIVERED", amount, recipients, date: settlement.date,
  }, settlement.notes);
  return { message: "تم تسجيل التسوية المالية يدوياً في السجل مع السبب." };
}

export function financeSummary(draft, comp) {
  const total = prizePool(comp);
  const paid = comp.participants.filter((p) => p.paymentStatus === "PAID").length;
  const prize = comp.results?.prize;
  return {
    total,
    paid,
    unpaid: comp.participants.length - paid,
    prizeStatus: prize?.status || null,
    prizeAmount: prize?.total || total,
  };
}
