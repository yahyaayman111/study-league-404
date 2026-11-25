import { useMemo, useState } from "react";
import { fmtDate, fmtMoney, prizePool, STATUS, computeStandings, visibleLibrary, BADGES } from "../domain.js";
import { LIcon, Stat, Pill, SectionHead, Empty, Avatar, BadgeChip } from "../ui.jsx";
import CompetitionCard from "../components/CompetitionCard.jsx";

export default function Dashboard({ go, openComp }) {
  const { state, session, can, student } = useLeagueHook();
  const [tab, setTab] = useState("active");
  const year = state.currentYearId;

  const standings = useMemo(() => computeStandings(state, year), [state, year]);
  const active = state.competitions.filter((c) => ["SUBMISSION_OPEN", "VOTING_OPEN", "PENDING_APPROVAL"].includes(c.status));
  const upcoming = state.competitions.filter((c) => c.status === "UPCOMING");
  const completed = state.competitions.filter((c) => c.status === "COMPLETED");
  const dates = state.competitions.filter((c) => ["SUBMISSION_OPEN", "VOTING_OPEN", "PENDING_APPROVAL"].includes(c.status));
  const list = tab === "active" ? active : tab === "upcoming" ? upcoming : completed;

  const prizess = state.competitions.flatMap((c) => c.results?.prize ? [c.results.prize] : []);
  const distributed = prizess.filter((p) => p.status === "DELIVERED").reduce((a, p) => a + (p.settlements?.reduce((s, x) => s + x.amount, 0) || p.total), 0);
  const points = state.pointsLedger.filter((p) => p.yearId === year).reduce((a, p) => a + p.points, 0);
  const voting = state.competitions.filter((c) => c.status === "VOTING_OPEN").length;
  const submissions = state.competitions.reduce((a, c) => a + c.submissions.length, 0);
  const published = visibleLibrary(state);
  const champion = state.annualChampions.find((c) => c.yearId === year);
  const pendingApproval = state.competitions.filter((c) => c.status === "PENDING_APPROVAL");

  const recentWinners = completed
    .filter((c) => c.results)
    .sort((a, b) => new Date(b.results.approvedAt) - new Date(a.results.approvedAt))
    .slice(0, 3);

  return (
    <div className="lg-view">
      <section className="lg-hero">
        <div className="lg-hero-copy">
          <div className="lg-hero-kicker"><span>404</span> STUDY LEAGUE</div>
          <h1>دوري 404 الدراسي</h1>
          <p>من التلخيص الفردي إلى منافسة أسبوعية عادلة: ملخصات بخط اليد، تصويت مجهول، جوائز، ومكتبة ملخصات معتمدة.</p>
          <div className="lg-hero-actions">
            <button type="button" className="lg-btn primary" onClick={() => go("competitions")}>
              <LIcon name="trophy" size={16} /> ساحة المسابقات
            </button>
            <button type="button" className="lg-btn ghost" onClick={() => go("library")}>
              <LIcon name="book" size={16} /> مكتبة الملخصات
            </button>
          </div>
          <div className="lg-hero-meta">
            <span><LIcon name="calendar" size={14} /> العام الدراسي {state.year.label}</span>
            <span><LIcon name="users" size={14} /> {state.group.name}</span>
            {champion && <span><LIcon name="crown" size={14} /> بطل العام: {state.students.find((s) => s.id === champion.championId)?.name}</span>}
          </div>
        </div>
        <div className="lg-hero-emblem" aria-hidden="true">
          <img src="/404-logo.jpeg" alt="" />
          <div className="lg-hero-ring" />
        </div>
      </section>

      <div className="lg-stats-grid">
        <Stat icon="trophy" label="مسابقات نشطة" value={active.length} hint={`${upcoming.length} قادمة`} tone="blue" />
        <Stat icon="file" label="ملخصات مقدمة" value={submissions} hint={`${published.length} منشورة في المكتبة`} tone="green" />
        <Stat icon="eye" label="تصويت مفتوح الآن" value={voting} hint="الهوية مخفية حتى الاعتماد" tone="amber" />
        <Stat icon="coin" label="جوائز مسلمة" value={fmtMoney(distributed)} hint="إجمالي الجوائز الموزعة" tone="purple" />
      </div>

      {pendingApproval.length > 0 && can("results.approve") && (
        <div className="lg-notice admin">
          <LIcon name="alert" size={18} />
          <div>
            <strong>{pendingApproval.length} مسابقة بانتظار اعتماد النتائج</strong>
            <p>راجع النتائج، وطبّق قاعدة كسر التعادل التاريخية، ثم اعتمد النتائج لإعلان الفائزين.</p>
          </div>
          <button type="button" className="lg-btn primary sm" onClick={() => go("admin", { tab: "results" })}>مراجعة واعتماد</button>
        </div>
      )}

      {student && (
        <div className="lg-notice soft">
          <LIcon name="sparkles" size={18} />
          <div>
            <strong>أهلاً {student.name}</strong>
            <p>لديك {state.notifications.filter((n) => n.userId === `student:${student.id}` && !n.isRead).length} إشعارات غير مقروءة، و{standings.find((s) => s.id === student.id)?.points || 0} نقطة هذا العام.</p>
          </div>
          <button type="button" className="lg-btn ghost sm" onClick={() => go("achievements")}>إنجازاتي</button>
        </div>
      )}

      <div className="lg-dash-main">
        <section className="lg-panel">
          <SectionHead title="ساحة المسابقات" sub="مسابقات مستقلة لكل مادة داخل المجموعة"
            action={<button type="button" className="lg-link" onClick={() => go("competitions")}>عرض الكل <LIcon name="chevron-left" size={14} /></button>} />
          <div className="lg-seg">
            {[
              ["active", `الحالية (${active.length})`],
              ["upcoming", `القادمة (${upcoming.length})`],
              ["completed", `المنتهية (${completed.length})`],
            ].map(([key, label]) => (
              <button key={key} type="button" className={tab === key ? "on" : ""} onClick={() => setTab(key)}>{label}</button>
            ))}
          </div>
          {list.length === 0 ? (
            <Empty icon="trophy" title="لا توجد مسابقات في هذا القسم" text="تابع الإشعارات لمعرفة موعد المسابقة القادمة." />
          ) : (
            <div className="lg-comp-grid">
              {list.slice(0, 4).map((c) => (
                <CompetitionCard key={c.id} comp={c} subject={state.subjects.find((s) => s.id === c.subjectId)} onOpen={openComp} />
              ))}
            </div>
          )}
        </section>

        <aside className="lg-panel">
          <SectionHead title="لوحة المتصدرين" sub={`ترتيب العام ${state.year.label}`}
            action={<button type="button" className="lg-link" onClick={() => go("hall")}>لوحة الشرف <LIcon name="chevron-left" size={14} /></button>} />
          <div className="lg-mini-podium">
            {standings.slice(0, 3).map((s, i) => (
              <div key={s.id} className={`lg-mini-row rank-${i + 1}`}>
                <span className="lg-rank">{i + 1}</span>
                <Avatar name={s.name} size={32} />
                <div className="lg-mini-name"><strong>{s.name}</strong><small>{s.subjects.slice(0, 2).join(" · ") || "لا توجد جوائز بعد"}</small></div>
                <b>{s.points}</b>
              </div>
            ))}
          </div>
          <div className="lg-divider" />
          <SectionHead title="أحدث الملخصات" sub="مكتبة الملخصات المعتمدة" />
          {published.slice(0, 3).map((e) => (
            <button key={e.id} type="button" className="lg-latest-row" onClick={() => go("library", { entryId: e.id })}>
              <span className="lg-doc"><LIcon name="book" size={15} /></span>
              <div><strong>{e.title}</strong><small>{state.subjects.find((s) => s.id === e.subjectId)?.name} · {e.attribution?.authorName}</small></div>
              <LIcon name="chevron-left" size={15} />
            </button>
          ))}
          {published.length === 0 && <p className="lg-muted sm">لا توجد ملخصات منشورة بعد.</p>}
        </aside>
      </div>

      <div className="lg-dash-main even">
        <section className="lg-panel">
          <SectionHead title="آخر الفائزين" sub="النتائج المعتمدة فقط" />
          <div className="lg-winner-list">
            {recentWinners.length === 0 && <Empty title="لا توجد نتائج معتمدة بعد" />}
            {recentWinners.map((c) => {
              const first = c.results.ranking.filter((r) => r.rank === 1);
              return (
                <div key={c.id} className="lg-winner-row">
                  <div className="lg-winner-subject"><span>{state.subjects.find((s) => s.id === c.subjectId)?.icon}</span></div>
                  <div className="lg-winner-info">
                    <strong>{c.title}</strong>
                    <small>
                      {first.map((r) => state.students.find((s) => s.id === r.studentId)?.name).join(" و ")}
                      {c.results.jointFirst ? " — مركز أول مشترك" : ""} · {fmtDate(c.results.approvedAt)}
                    </small>
                  </div>
                  <Pill tone="green">{c.results.jointFirst ? "مشترك" : "المركز الأول"}</Pill>
                </div>
              );
            })}
          </div>
        </section>

        <section className="lg-panel">
          <SectionHead title="إحصاءات الدوري" sub="أرقام العام الحالي" />
          <div className="lg-key-numbers">
            <div><span>نقاط الدوري</span><strong>{points}</strong><small>نقطة سنوية</small></div>
            <div><span>مسابقات مكتملة</span><strong>{completed.length}</strong><small>من أصل {state.competitions.length}</small></div>
            <div><span>جوائز معلقة</span><strong>{state.competitions.filter((c) => c.results?.prize?.status === "ON_HOLD_FOR_JOINT_WINNER_AGREEMENT").length}</strong><small>بانتظار اتفاق مشترك</small></div>
            <div><span>مشاركون</span><strong>{state.students.length}</strong><small>{state.group.name}</small></div>
          </div>
          <div className="lg-divider" />
          <div className="lg-badge-preview">
            {Object.entries(BADGES).slice(0, 4).map(([key, b]) => <BadgeChip key={key} badge={b} small />)}
          </div>
        </section>
      </div>

      {dates.length > 0 && (
        <section className="lg-panel">
          <SectionHead title="مواعيد مهمة" sub="أقرب مراحل المسابقات" />
          <div className="lg-timeline-mini">
            {dates.slice(0, 4).map((c) => (
              <button key={c.id} type="button" onClick={() => openComp(c.id)}>
                <span className={`lg-dot ${STATUS[c.status].tone}`} />
                <div><strong>{c.title}</strong><small>{STATUS[c.status].ar}</small></div>
                <span>{fmtDate(c.status === "SUBMISSION_OPEN" ? c.submissionDeadline : c.votingEnd)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* the hook is imported below to keep the view's imports grouped */
import { useLeague as useLeagueHook } from "../store.jsx";
