import { useMemo, useState } from "react";
import { BADGES, computeStandings, fmtDate, fmtMoney, STATUS } from "../domain.js";
import { useLeague } from "../store.jsx";
import { LIcon, Stat, SectionHead, Avatar, Pill, Empty, BadgeChip } from "../ui.jsx";

export default function Achievements({ go, openComp }) {
  const { state, student, session, can, subjectById } = useLeague();
  const isAdmin = can("finance.manage");
  const [selectedId, setSelectedId] = useState(student?.id || state.students[0]?.id);
  const target = isAdmin ? state.students.find((s) => s.id === Number(selectedId)) : student;
  const standings = useMemo(() => computeStandings(state), [state]);
  const row = standings.find((s) => s.id === target?.id);

  if (!target) return <Empty title="لا يوجد طالب" />;

  const participations = state.competitions
    .filter((c) => c.participants.some((p) => p.studentId === target.id))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const ownSubs = state.competitions.flatMap((c) => c.submissions.filter((s) => s.studentId === target.id).map((s) => ({ ...s, comp: c })));
  const published = state.library.filter((e) => e.studentId === target.id && e.status === "PUBLISHED");

  const contributions = participations
    .map((c) => ({ comp: c, p: c.participants.find((x) => x.studentId === target.id) }))
    .filter((x) => x.p.paymentStatus === "PAID");
  const totalPaid = contributions.reduce((a, x) => a + Number(x.comp.fee), 0);

  return (
    <div className="lg-view">
      <SectionHead title="صفحة إنجازاتي" sub="نقاطك، جوائزك، شاراتك، وسجل مشاركاتك المالية"
        action={isAdmin && (
          <select className="lg-select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            {state.students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )} />

      <div className="lg-profile-head">
        <div className="lg-profile-id">
          <Avatar name={target.name} size={64} />
          <div>
            <div className="lg-profile-name">
              <h2>{target.name}</h2>
              {target.editor && <Pill tone="purple">Summary Editor</Pill>}
              {target.badges.some((b) => b.badgeId === "summary_contributor") && <Pill tone="blue">Summary Contributor</Pill>}
            </div>
            <p>{state.group.name} · كود الطالب {target.code}</p>
            <div className="lg-profile-badges">
              {target.badges.slice(0, 6).map((b, i) => {
                const badge = BADGES[b.badgeId];
                return badge ? <BadgeChip key={i} badge={badge} small /> : null;
              })}
              {target.badges.length === 0 && <span className="lg-muted sm">لا توجد شارات بعد — شارك في المسابقات لتحصل عليها.</span>}
            </div>
          </div>
        </div>
        <div className="lg-profile-rank">
          <span>الترتيب العام</span>
          <strong>#{row?.overallRank || "—"}</strong>
          <small>من {state.students.length} طلاب</small>
        </div>
      </div>

      <div className="lg-stats-grid four">
        <Stat icon="star" label="مجموع النقاط" value={row?.points || 0} hint={`العام ${state.year.label}`} tone="amber" />
        <Stat icon="chart" label="الترتيب العام" value={`#${row?.overallRank || "—"}`} hint="عبر جميع المواد" tone="blue" />
        <Stat icon="medal" label="الميداليات" value={`${row?.medals.gold || 0} / ${row?.medals.silver || 0} / ${row?.medals.bronze || 0}`} hint="ذهبي / فضي / برونزي" tone="green" />
        <Stat icon="coin" label="المساهمات المالية" value={fmtMoney(totalPaid)} hint={`${contributions.length} مساهمة مسددة`} tone="purple" />
      </div>

      <div className="lg-ach-grid">
        <section className="lg-panel">
          <SectionHead title="خزانة الشارات" sub="كل شارة بتاريخها وطريقة الحصول عليها" />
          <div className="lg-badge-cabinet">
            {Object.entries(BADGES).map(([key, badge]) => {
              const owned = target.badges.find((b) => b.badgeId === key);
              return (
                <div key={key} className={`lg-badge-card ${owned ? "owned" : ""}`}>
                  <div className="lg-badge-icon">{badge.icon}</div>
                  <div>
                    <strong>{badge.ar}</strong>
                    <small>{badge.en}</small>
                    <p>{badge.desc}</p>
                    {owned ? <span className="lg-badge-date"><LIcon name="check" size={12} /> مُنحت {fmtDate(owned.at)}</span>
                      : <span className="lg-badge-locked"><LIcon name="lock" size={12} /> لم تُمنح بعد</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="lg-ach-side">
          <section className="lg-panel">
            <SectionHead title="ملخصاتي المنشورة" sub={`${published.length} ملخص في المكتبة`} />
            {published.length === 0 ? <p className="lg-muted sm">لم يُنشر لك ملخص بعد.</p> : published.map((e) => (
              <button key={e.id} type="button" className="lg-latest-row" onClick={() => go("library", { entryId: e.id })}>
                <span className="lg-doc"><LIcon name="book" size={15} /></span>
                <div><strong>{e.title}</strong><small>{subjectById(e.subjectId)?.name} · {fmtDate(e.publishedAt)}</small></div>
                <LIcon name="chevron-left" size={15} />
              </button>
            ))}
          </section>

          <section className="lg-panel">
            <SectionHead title="سجل المساهمات" sub={isAdmin ? "عرض إداري" : "سجلك المالي الخاص فقط"} />
            <div className="lg-contrib-list">
              {contributions.map(({ comp, p }) => (
                <div key={comp.id} className="lg-contrib-row">
                  <div><strong>{comp.title}</strong><small>{subjectById(comp.subjectId)?.name} · {fmtDate(p.paidAt)}</small></div>
                  <span className="lg-contrib-amount">+{fmtMoney(comp.fee)}</span>
                </div>
              ))}
              {contributions.length === 0 && <p className="lg-muted sm">لا توجد مساهمات مسددة.</p>}
            </div>
          </section>
        </div>
      </div>

      <section className="lg-panel">
        <SectionHead title="سجل المشاركات" sub="كل مسابقة انضممت إليها وحالتها" />
        {participations.length === 0 ? <Empty icon="trophy" title="لم تشارك في أي مسابقة بعد" text="ابدأ بالانضمام إلى مسابقة في ساحة المسابقات." /> : (
          <div className="lg-table-wrap">
            <table className="lg-table">
              <thead><tr><th>المسابقة</th><th>المادة</th><th>حالة المسابقة</th><th>المساهمة</th><th>الملخص</th><th>المركز</th><th>النقاط</th></tr></thead>
              <tbody>
                {participations.map((c) => {
                  const p = c.participants.find((x) => x.studentId === target.id);
                  const sub = c.submissions.find((x) => x.studentId === target.id);
                  const rank = c.results?.ranking.find((r) => r.studentId === target.id);
                  return (
                    <tr key={c.id}>
                      <td><button type="button" className="lg-link" onClick={() => openComp(c.id)}>{c.title}</button></td>
                      <td>{subjectById(c.subjectId)?.name}</td>
                      <td><Pill tone={STATUS[c.status].tone}>{STATUS[c.status].short}</Pill></td>
                      <td><Pill tone={p.paymentStatus === "PAID" ? "green" : "amber"}>{p.paymentStatus === "PAID" ? "مدفوعة" : "غير مدفوعة"}</Pill></td>
                      <td>{sub ? `${sub.images.length} صفحات` : "لم يقدم"}</td>
                      <td>{rank ? <span className={`lg-rank-badge r${rank.rank}`}>{rank.joint ? "🥇 مشترك" : `#${rank.rank}`}</span> : "—"}</td>
                      <td>{rank ? <b className="lg-points">+{rank.points}</b> : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {!student && isAdmin && (
        <div className="lg-rule-note"><LIcon name="eye" size={16} /><p>أنت تستعرض إنجازات الطالب كمدير. الطلاب لا يمكنهم رؤية السجلات المالية لغيرهم.</p></div>
      )}
    </div>
  );
}
