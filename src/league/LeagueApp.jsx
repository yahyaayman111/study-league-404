import { useEffect, useState } from "react";
import { LeagueProvider, useLeague } from "./store.jsx";
import { LIcon, Avatar, toastNode } from "./ui.jsx";
import Dashboard from "./views/Dashboard.jsx";
import Competitions from "./views/Competitions.jsx";
import Library from "./views/Library.jsx";
import HallOfFame from "./views/HallOfFame.jsx";
import Achievements from "./views/Achievements.jsx";
import AdminConsole from "./views/AdminConsole.jsx";
import "./league.css";

const TITLES = {
  dashboard: "لوحة الدوري الرئيسية",
  competitions: "ساحة المسابقات",
  library: "مكتبة الملخصات",
  hall: "لوحات الشرف",
  achievements: "إنجازاتي",
  admin: "إدارة الدوري",
};

function LeagueShell() {
  const { state, session, student, notifications, unread, actions, toast, setToast, storageWarning, can } = useLeague();
  const [route, setRoute] = useState({ tab: "dashboard" });
  const [bell, setBell] = useState(false);

  const tabs = [
    { key: "dashboard", label: "نظرة عامة", icon: "grid" },
    { key: "competitions", label: "المسابقات", icon: "trophy" },
    { key: "library", label: "المكتبة", icon: "book" },
    { key: "hall", label: "لوحات الشرف", icon: "crown" },
    { key: "achievements", label: "إنجازاتي", icon: "star" },
    ...(can("summary.review") ? [{ key: "admin", label: can("results.approve") ? "الإدارة" : "المراجعة", icon: "shield" }] : []),
  ];

  const go = (tab, payload = {}) => {
    setBell(false);
    if (tab === "admin") {
      setRoute({ tab: "admin", adminTab: payload.tab, competitionId: payload.competitionId, entryId: payload.entryId });
    } else if (tab === "library") {
      setRoute({ tab: "library", entryId: payload.entryId });
    } else {
      setRoute({ tab, compId: payload.competitionId || payload.compId });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openComp = (id) => {
    if (!id) setRoute({ tab: "competitions" });
    else setRoute({ tab: "competitions", compId: id });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setTab = (key) => {
    setBell(false);
    setRoute(key === "admin" ? { tab: "admin" } : { tab: key });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!tabs.some((t) => t.key === route.tab)) setRoute({ tab: "dashboard" });
  }, [tabs, route.tab]);

  const displayName = session.kind === "student" ? student?.name : session.name;
  const roleLabel = session.kind === "group_admin" ? "مدير المجموعة" : session.kind === "platform_admin" ? "مدير المنصة" : student?.editor ? "طالب · محرر ملخصات" : "طالب";

  return (
    <div className="lg-app" dir="rtl">
      <header className="lg-top">
        <div className="lg-top-brand">
          <img src="/404-logo.jpeg" alt="404" className="lg-logo" />
          <div>
            <div className="lg-top-title">دوري 404 الدراسي</div>
            <div className="lg-top-sub">404 Study League · {state.year.label}</div>
          </div>
        </div>

        <nav className="lg-mainnav" aria-label="أقسام الدوري">
          {tabs.map((t) => (
            <button key={t.key} type="button" className={route.tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>
              <LIcon name={t.icon} size={16} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="lg-top-actions">
          <div className="lg-bell-wrap">
            <button type="button" className="lg-bell" onClick={() => setBell((v) => !v)} aria-label="الإشعارات">
              <LIcon name="bell" size={18} />
              {unread > 0 && <b>{unread}</b>}
            </button>
            {bell && (
              <div className="lg-notif-panel">
                <div className="lg-notif-head">
                  <strong>الإشعارات</strong>
                  <button type="button" className="lg-link" onClick={() => actions.markAllRead(session.kind === "student" ? `student:${session.studentId}` : session.kind)}>تحديد الكل كمقروء</button>
                </div>
                <div className="lg-notif-list">
                  {notifications.length === 0 && <p className="lg-muted sm">لا توجد إشعارات.</p>}
                  {notifications.slice(0, 12).map((n) => (
                    <button key={n.id} type="button" className={`lg-notif ${n.isRead ? "" : "unread"}`}
                      onClick={() => { actions.markNotificationRead(n.id); if (n.link) go(n.link.tab, n.link); }}>
                      <span className="lg-notif-dot" />
                      <div><strong>{n.title}</strong><p>{n.body}</p><small>{new Date(n.createdAt).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</small></div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="lg-user">
            <Avatar name={displayName || "؟"} size={34} />
            <div><strong>{displayName}</strong><small>{roleLabel}</small></div>
          </div>
        </div>
      </header>

      {storageWarning && (
        <div className="lg-storage-warn">
          <LIcon name="alert" size={16} />
          <span>تعذر حفظ كل البيانات محلياً (مساحة التخزين ممتلئة). قد تُفقد بعض الصور بعد التحديث.</span>
        </div>
      )}

      <main className="lg-main">
        {route.tab === "dashboard" && <Dashboard go={go} openComp={openComp} />}
        {route.tab === "competitions" && <Competitions route={route} go={go} openComp={openComp} />}
        {route.tab === "library" && <Library route={route} go={go} />}
        {route.tab === "hall" && <HallOfFame go={go} openComp={openComp} />}
        {route.tab === "achievements" && <Achievements go={go} openComp={openComp} />}
        {route.tab === "admin" && <AdminConsole route={{ tab: route.adminTab, competitionId: route.competitionId, entryId: route.entryId }} go={go} />}
      </main>

      <footer className="lg-footer">
        <span>404 Study League — نموذج تفاعلي للعرض والاختبار</span>
        <span>{state.group.name} · العام {state.year.label}</span>
      </footer>

      {toastNode(toast, () => setToast(null))}
    </div>
  );
}

export default function LeagueApp({ session, platform }) {
  return (
    <LeagueProvider session={session} platform={platform}>
      <LeagueShell />
    </LeagueProvider>
  );
}
