import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createSeed, can } from "./domain.js";
import * as comps from "./services/competitions.js";
import * as voting from "./services/voting.js";
import * as results from "./services/results.js";
import * as finance from "./services/finance.js";
import * as roles from "./services/roles.js";
import * as library from "./services/library.js";

const KEY = "study404.league.v2";
const Ctx = createContext(null);

export const useLeague = () => useContext(Ctx);

const clone = (value) => JSON.parse(JSON.stringify(value));

function load(platform) {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1 && Array.isArray(parsed.competitions)) return parsed;
    }
  } catch {
    /* corrupted storage: reseed */
  }
  return createSeed(platform?.students || [], platform?.subjects || []);
}

function persist(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function LeagueProvider({ session, platform, children }) {
  const [state, setState] = useState(() => load(platform));
  const [toast, setToast] = useState(null);
  const [storageWarning, setStorageWarning] = useState(false);

  const student = session?.kind === "student"
    ? state.students.find((s) => s.id === Number(session.studentId)) || state.students[0]
    : null;

  const effSession = useMemo(() => ({
    ...session,
    studentId: student?.id,
    isEditor: Boolean(student?.editor),
    studentName: student?.name,
  }), [session, student]);

  useEffect(() => {
    if (student && session?.studentId !== student.id) {
      /* keep the mapped student stable; the login layer resolves codes */
    }
  }, [student, session]);

  useEffect(() => {
    if (!persist(state)) setStorageWarning(true);
  }, [state]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(id);
  }, [toast]);

  const run = useCallback((fn) => {
    try {
      const draft = clone(state);
      const res = fn(draft, effSession);
      setState(draft);
      if (res?.message) setToast({ type: "success", text: res.message });
      return { ok: true, ...(res || {}) };
    } catch (e) {
      const text = e?.message || "تعذر تنفيذ الإجراء.";
      setToast({ type: "error", text });
      return { ok: false, error: text };
    }
  }, [state, effSession]);

  const actions = useMemo(() => ({
    createCompetition: (payload) => run((d, s) => comps.createCompetition(d, payload, { session: s })),
    updateCompetition: (id, payload) => run((d, s) => comps.updateCompetition(d, id, payload, { session: s })),
    advanceStatus: (id) => run((d, s) => comps.advanceStatus(d, id, { session: s })),
    joinCompetition: (id) => run((d, s) => comps.joinCompetition(d, id, { session: s })),
    payContribution: (id) => run((d, s) => comps.payContribution(d, id, { session: s })),
    submitSummary: (id, payload) => run((d, s) => comps.submitSummary(d, id, payload, { session: s })),
    sendDeadlineReminder: (id) => run((d, s) => comps.sendDeadlineReminder(d, id, { session: s })),
    castVotes: (id, ids) => run((d, s) => voting.castVotes(d, id, ids, { session: s })),
    approveResults: (id, rule) => run((d, s) => results.approveResults(d, id, { session: s, nextPositionRule: rule })),
    adjustPoints: (compId, studentId, points, reason) => run((d, s) => results.adjustPoints(d, compId, studentId, points, reason, { session: s })),
    closeAcademicYear: () => run((d, s) => results.closeAcademicYear(d, { session: s })),
    markPayment: (compId, studentId, status) => run((d, s) => finance.markPayment(d, compId, studentId, status, { session: s })),
    deliverPrize: (compId) => run((d, s) => finance.deliverPrize(d, compId, { session: s })),
    settleJointPrize: (compId, payload) => run((d, s) => finance.settleJointPrize(d, compId, payload, { session: s })),
    grantContributor: (studentId, reason) => run((d, s) => roles.grantContributor(d, studentId, reason, { session: s })),
    revokeContributor: (studentId, reason) => run((d, s) => roles.revokeContributor(d, studentId, reason, { session: s })),
    setEditor: (studentId, enabled, reason) => run((d, s) => roles.setEditor(d, studentId, enabled, reason, { session: s })),
    submitWinningSummary: (compId, payload) => run((d, s) => library.submitWinningSummary(d, compId, payload, { session: s })),
    updateEntryContent: (entryId, payload) => run((d, s) => library.updateEntryContent(d, entryId, payload, { session: s })),
    suggestEdit: (entryId, text) => run((d, s) => library.suggestEdit(d, entryId, text, { session: s })),
    publishEntry: (entryId) => run((d, s) => library.publishEntry(d, entryId, { session: s })),
    markNotificationRead: (id) => run((d) => {
      const n = d.notifications.find((x) => x.id === id);
      if (n) n.isRead = true;
      return null;
    }),
    markAllRead: (userId) => run((d) => {
      for (const n of d.notifications) if (n.userId === userId) n.isRead = true;
      return null;
    }),
    resetDemo: () => {
      try {
        localStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
      setState(createSeed(platform?.students || [], platform?.subjects || []));
      setToast({ type: "success", text: "تمت استعادة بيانات الدوري التجريبية." });
      return { ok: true };
    },
    disableStorageWarning: () => setStorageWarning(false),
  }), [run, platform]);

  const userId = effSession.kind === "student" ? `student:${effSession.studentId}` : effSession.kind;
  const notifications = state.notifications.filter((n) => n.userId === userId);
  const unread = notifications.filter((n) => !n.isRead).length;

  const value = useMemo(() => ({
    state,
    session: effSession,
    student,
    userId,
    notifications,
    unread,
    toast,
    setToast,
    storageWarning,
    actions,
    can: (perm) => can(effSession, perm),
    subjectById: (id) => state.subjects.find((s) => s.id === Number(id)),
    studentById: (id) => state.students.find((s) => s.id === Number(id)),
    compById: (id) => state.competitions.find((c) => c.id === id),
  }), [state, effSession, student, userId, notifications, unread, toast, storageWarning, actions]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
