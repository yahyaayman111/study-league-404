import { awardBadge, fail, findStudent, log, notify, removeBadge, requirePerm } from "./common.js";

export function grantContributor(draft, studentId, reason, ctx) {
  requirePerm(ctx.session, "roles.manage");
  if (!reason?.trim()) fail("سبب منح الشارة مطلوب.");
  const student = findStudent(draft, studentId);
  if (student.badges.some((b) => b.badgeId === "summary_contributor")) fail("الطالب يحمل شارة مساهم في التلخيص بالفعل.");
  awardBadge(draft, ctx.session, student.id, "summary_contributor", reason.trim());
  notify(draft, `student:${student.id}`, "شارة جديدة: مساهم في التلخيص", `منحك مدير المجموعة شارة Summary Contributor. السبب: ${reason.trim()}`, { tab: "achievements" });
  return { message: `تم منح شارة Summary Contributor للطالب ${student.name}.` };
}

export function revokeContributor(draft, studentId, reason, ctx) {
  requirePerm(ctx.session, "roles.manage");
  if (!reason?.trim()) fail("سبب سحب الشارة مطلوب.");
  const student = findStudent(draft, studentId);
  if (!student.badges.some((b) => b.badgeId === "summary_contributor")) fail("الطالب لا يحمل هذه الشارة.");
  removeBadge(draft, ctx.session, student.id, "summary_contributor", reason.trim());
  return { message: "تم سحب الشارة مع تسجيل السبب في سجل التدقيق." };
}

export function setEditor(draft, studentId, enabled, reason, ctx) {
  requirePerm(ctx.session, "roles.manage");
  if (!reason?.trim()) fail("سبب التغيير مطلوب لتوثيق منح أو سحب دور المحرر.");
  const student = findStudent(draft, studentId);
  if (student.editor === enabled) fail("حالة الدور محدثة بالفعل.");
  student.editor = enabled;
  if (enabled) {
    awardBadge(draft, ctx.session, student.id, "summary_editor", reason.trim(), true);
  } else {
    student.badges = student.badges.filter((b) => b.badgeId !== "summary_editor");
  }
  log(draft, ctx.session, enabled ? "منح دور محرر الملخصات" : "سحب دور محرر الملخصات", `student:${student.id}`, !enabled, enabled, reason.trim());
  notify(draft, `student:${student.id}`, enabled ? "تم تعيينك محرراً للملخصات" : "تم سحب دور محرر الملخصات", enabled
    ? "يمكنك الآن مراجعة الملخصات واقتراح التعديلات، دون صلاحية الاعتماد أو النشر."
    : "تم تغيير صلاحياتك. تواصل مع مدير المجموعة للاستفسار.", { tab: "achievements" });
  return { message: enabled ? "تم منح دور Summary Editor (مراجعة أولية فقط)." : "تم سحب دور Summary Editor." };
}

export function editorSuggestions(draft, entryId) {
  return draft.editorSuggestions.filter((s) => s.entryId === entryId);
}
