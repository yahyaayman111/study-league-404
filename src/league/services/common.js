import { can, uid, STATUS, prizePool } from "../domain.js";

export class RuleError extends Error {}

export function fail(message) {
  throw new RuleError(message);
}

export function requirePerm(session, permission) {
  if (!can(session, permission)) fail("لا تملك الصلاحية لتنفيذ هذا الإجراء.");
}

export function findComp(draft, id) {
  const comp = draft.competitions.find((c) => c.id === id);
  if (!comp) fail("المسابقة غير موجودة.");
  return comp;
}

export function findStudent(draft, id) {
  const s = draft.students.find((x) => x.id === Number(id));
  if (!s) fail("الطالب غير موجود.");
  return s;
}

export function isParticipant(comp, studentId) {
  return comp.participants.some((p) => p.studentId === Number(studentId));
}

export function participant(comp, studentId) {
  return comp.participants.find((p) => p.studentId === Number(studentId));
}

export function log(draft, session, action, target, before, after, reason = "") {
  draft.audit.unshift({
    id: uid("audit"),
    actor: session?.name || "النظام",
    actorRole: session?.kind || "system",
    action,
    target,
    reason: reason || "",
    before: before === undefined ? null : before,
    after: after === undefined ? null : after,
    at: new Date().toISOString(),
  });
  if (draft.audit.length > 300) draft.audit.length = 300;
}

export function notify(draft, userId, title, body, link) {
  draft.notifications.unshift({
    id: uid("n"),
    userId,
    title,
    body,
    link: link || null,
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  if (draft.notifications.length > 200) draft.notifications.length = 200;
}

export function notifyGroup(draft, title, body, link) {
  for (const s of draft.students) notify(draft, `student:${s.id}`, title, body, link);
}

export function awardBadge(draft, session, studentId, badgeId, reason, silent = false) {
  const s = findStudent(draft, studentId);
  if (s.badges.some((b) => b.badgeId === badgeId)) return false;
  s.badges.push({ badgeId, at: new Date().toISOString(), note: reason || "" });
  if (!silent) {
    notify(draft, `student:${s.id}`, "حصلت على شارة جديدة", `تم منحك شارة «${badgeId}».`, { tab: "achievements" });
  }
  log(draft, session, "منح شارة", `student:${s.id}`, null, badgeId, reason);
  return true;
}

export function removeBadge(draft, session, studentId, badgeId, reason) {
  const s = findStudent(draft, studentId);
  s.badges = s.badges.filter((b) => b.badgeId !== badgeId);
  log(draft, session, "سحب شارة", `student:${s.id}`, badgeId, null, reason);
  notify(draft, `student:${s.id}`, "تحديث الشارات", `تم سحب شارة «${badgeId}».`, { tab: "achievements" });
}

export function prizeState(comp) {
  return prizePool(comp);
}

export function requireStatus(comp, status, action) {
  if (comp.status !== status) {
    fail(`لا يمكن ${action} الآن. حالة المسابقة الحالية: «${STATUS[comp.status]?.ar || comp.status}».`);
  }
}

export function withinWindow(value, label) {
  if (!value || Date.now() > new Date(value).getTime()) {
    fail(`انتهت ${label}. لا يمكن تنفيذ الإجراء بعد الموعد المحدد.`);
  }
}
