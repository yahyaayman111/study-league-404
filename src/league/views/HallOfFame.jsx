import { useMemo, useState } from "react";
import { BADGES, computeStandings, fmtDate, fmtMoney, STATUS } from "../domain.js";
import { useLeague } from "../store.jsx";
import { LIcon, Modal, Pill, SectionHead, Avatar, Empty, BadgeChip } from "../ui.jsx";

const medal = (n) => (n === 1 ? "🥇" : n === 2 ? "🥈" : "🥉");

export default function HallOfFame({ go, openComp }) {
  const { state, can, actions, subjectById } = useLeague();
  const [subject, setSubject] = useState("all");
  const [confirmClose, setConfirmClose] = useState(false);
  const standings = useMemo(() => computeStandings(state), [state]);
  const closedChampion = state.annualChampions.find((c) => c.yearId === state.currentYearId);

  const completed = state.competitions
    .filter((c) => c.status === "COMPLETED" && c.results)
    .filter((c) => subject === "all" || c.subjectId === Number(subject))
    .sort((a, b) => new Date(b.results.approvedAt) - new Date(a.results.approvedAt));

  const subjectStats = useMemo(() => {
    if (subject === "all") return [];
    return state.students.map((s) => {
      const entries = state.pointsLedger.filter((p) => p.studentId === s.id && p.subjectId === Number(subject) && p.rank > 0);
      return {
        ...s,
        points: entries.reduce((a, p) => a + p.points, 0),
        gold: entries.filter((p) => p.rank === 1).length,
        silver: entries.filter((p) => p.rank === 2).length,
        bronze: entries.filter((p) => p.rank === 3).length,
      };
    }).filter((s) => s.gold + s.silver + s.bronze > 0)
      .sort((a, b) => b.points - a.points || b.gold - a.gold);
  }, [state, subject]);

  return (
    <div className="lg-view">
      <SectionHead title="لوحات الشرف" sub="لوحة شرف لكل مادة + لوحة الشرف العامة للمجموعة"
        action={can("year.close") && !state.yearClosed && (
          <button type="button" className="lg-btn primary" onClick={() => setConfirmClose(true)}>
            <LIcon name="crown" size={16} /> إغلاق العام وتتويج 404 Annual Champion
          </button>
        )} />

      {state.annualChampions.length > 0 && (
        <div className="lg-champion-banner">
          <div className="lg-champion-crown"><LIcon name="crown" size={26} /></div>
          <div>
            <span>404 ANNUAL CHAMPION</span>
            <h3>{state.students.find((s) => s.id === state.annualChampions[0].championId)?.name}</h3>
            <p>بطل العام {state.annualChampions[0].yearId} برصيد {state.annualChampions[0].points} نقطة — مثبت في أرشيف لوحة الشرف.</p>
          </div>
          <Pill tone="amber">{state.annualChampions[0].yearId}</Pill>
        </div>
      )}

      <div className="lg-hall-grid">
        <section className="lg-panel">
          <SectionHead title="منصة التتويج" sub={`أفضل 3 طلاب — ${state.year.label}`} />
          <div className="lg-podium">
            {standings.slice(0, 3).map((s, i) => (
              <div key={s.id} className={`lg-podium-item p${i + 1}`}>
                <div className="lg-podium-avatar"><Avatar name={s.name} size={i === 0 ? 64 : 52} />{i === 0 && <span className="lg-podium-crown"><LIcon name="crown" size={18} /></span>}</div>
                <strong>{s.name}</strong>
                <span className="lg-podium-points">{s.points} نقطة</span>
                <small>{s.medals.gold} ذهبية · {s.medals.silver} فضية · {s.medals.bronze} برونزية</small>
                <div className="lg-podium-base">{i === 0 ? "1" : i === 1 ? "2" : "3"}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="lg-panel">
          <SectionHead title="أبطال الأعوام" sub="أرشيف لا يُحذف" />
          <div className="lg-champion-list">
            {state.annualChampions.map((c) => (
              <div key={c.yearId} className="lg-champion-row">
                <span className="lg-champion-icon"><LIcon name="crown" size={18} /></span>
                <div>
                  <strong>{state.students.find((s) => s.id === c.championId)?.name}</strong>
                  <small>بطل العام {c.yearId} — {c.points} نقطة</small>
                </div>
                <Pill tone={c.yearId === state.currentYearId ? "green" : "slate"}>{c.yearId}</Pill>
              </div>
            ))}
            {state.annualChampions.length === 0 && <Empty icon="crown" title="لا يوجد أبطال بعد" text="يُتوج البطل عند إغلاق العام الدراسي." />}
          </div>
        </section>
      </div>

      <section className="lg-panel">
        <SectionHead title="لوحة الشرف العامة" sub="الترتيب التراكمي عبر جميع المواد — النقاط لا تُصفَّر خلال العام"
          action={(
            <select className="lg-select" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="all">كل المواد</option>
              {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )} />
        {subject !== "all" && subjectStats.length > 0 && (
          <div className="lg-subject-honor">
            <div className="lg-honor-title">{subjectById(subject)?.icon} إحصاءات {subjectById(subject)?.name}</div>
            <div className="lg-honor-grid">
              {subjectStats.map((s) => (
                <div key={s.id} className="lg-honor-person">
                  <Avatar name={s.name} size={32} />
                  <div><strong>{s.name}</strong><small>{s.points} نقطة</small></div>
                  <span>🥇 {s.gold} · 🥈 {s.silver} · 🥉 {s.bronze}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="lg-table-wrap">
          <table className="lg-table leaderboard">
            <thead>
              <tr><th>#</th><th>الطالب</th><th>النقاط</th><th>🥇</th><th>🥈</th><th>🥉</th><th>الشارات</th><th>المواد</th></tr>
            </thead>
            <tbody>
              {standings.map((s) => (
                <tr key={s.id}>
                  <td><span className={`lg-rank-badge ${s.overallRank <= 3 ? `r${s.overallRank}` : ""}`}>{s.overallRank}</span></td>
                  <td><div className="lg-person"><Avatar name={s.name} size={28} /><strong>{s.name}</strong></div></td>
                  <td><b className="lg-points">{s.points}</b></td>
                  <td>{s.medals.gold}</td><td>{s.medals.silver}</td><td>{s.medals.bronze}</td>
                  <td>
                    <div className="lg-badge-mini-list">
                      {s.badges.slice(0, 4).map((b, i) => {
                        const badge = BADGES[b.badgeId];
                        return badge ? <span key={i} title={`${badge.en} — ${badge.desc}`}>{badge.icon}</span> : null;
                      })}
                      {s.badges.length === 0 && <span className="lg-muted sm">—</span>}
                    </div>
                  </td>
                  <td><span className="lg-muted sm">{s.subjects.slice(0, 3).join(" · ") || "—"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="lg-panel">
        <SectionHead title="أرشيف المسابقات" sub={subject === "all" ? "جميع المواد" : subjectById(subject)?.name} />
        {completed.length === 0 ? (
          <Empty icon="calendar" title="لا توجد مسابقات معتمدة بعد" />
        ) : (
          <div className="lg-archive">
            {completed.map((c) => {
              const subj = subjectById(c.subjectId);
              const winners = c.results.ranking.filter((r) => r.rank <= 3);
              return (
                <div key={c.id} className="lg-archive-row">
                  <div className="lg-archive-date">
                    <strong>{fmtDate(c.results.approvedAt)}</strong>
                    <small>{subj?.name}</small>
                  </div>
                  <div className="lg-archive-title">
                    <button type="button" className="lg-link" onClick={() => openComp(c.id)}>{c.title}</button>
                    {c.results.jointFirst && <Pill tone="amber">مركز أول مشترك</Pill>}
                  </div>
                  <div className="lg-archive-winners">
                    {winners.map((r) => (
                      <span key={`${r.studentId}-${r.rank}`} title={`${medal(r.rank)} ${state.students.find((s) => s.id === r.studentId)?.name}`}>
                        {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : "🥉"} {state.students.find((s) => s.id === r.studentId)?.name}
                      </span>
                    ))}
                  </div>
                  <button type="button" className="lg-icon-btn" onClick={() => openComp(c.id)} aria-label="تفاصيل"><LIcon name="chevron-left" size={16} /></button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="lg-rule-note">
        <LIcon name="shield" size={16} />
        <p>لا تُعرض إلا النتائج المعتمدة. النتائج المعلقة أو المؤقتة لا تظهر في لوحات الشرف أو الترتيب العام.</p>
      </div>

      {confirmClose && (
        <Modal title="إغلاق العام الدراسي" subtitle="سيُتوج صاحب أعلى رصيد بلقب 404 Annual Champion" onClose={() => setConfirmClose(false)}
          footer={(
            <>
              <button type="button" className="lg-btn ghost" onClick={() => setConfirmClose(false)}>إلغاء</button>
              <button type="button" className="lg-btn primary" onClick={() => { const r = actions.closeAcademicYear(); if (r.ok) setConfirmClose(false); }}>
                <LIcon name="crown" size={15} /> تأكيد الإغلاق والتتويج
              </button>
            </>
          )}>
          <p className="lg-muted">سيتم أرشفة الترتيب النهائي ومنح شارة Annual Champion بشكل دائم. لا تُحذف سجلات النقاط السابقة، ويمكن مراجعة أرشيف الأعوام لاحقاً.</p>
          <div className="lg-close-preview">
            {standings.slice(0, 3).map((s, i) => (
              <div key={s.id}><span>{i + 1}</span><strong>{s.name}</strong><b>{s.points}</b></div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
