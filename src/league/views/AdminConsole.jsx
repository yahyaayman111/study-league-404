import { useEffect, useMemo, useState } from "react";
import { BADGES, STATUS, computeStandings, fmtDate, fmtMoney, prizePool, rankCompetition } from "../domain.js";
import { useLeague } from "../store.jsx";
import { LIcon, Modal, Pill, Field, Empty, SectionHead, Avatar, Tabs } from "../ui.jsx";
import BookReader from "../BookReader.jsx";
import { downloadEntryPdf } from "../pdf.js";

const money = (n) => `${Number(n || 0).toLocaleString("ar-EG")} ج.م`;

function downloadCsv(rows, filename) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function ReasonModal({ title, label, onSubmit, onClose, extra }) {
  const [reason, setReason] = useState("");
  return (
    <Modal title={title} onClose={onClose} size="sm"
      footer={(
        <>
          <button type="button" className="lg-btn ghost" onClick={onClose}>إلغاء</button>
          <button type="button" className="lg-btn primary" disabled={!reason.trim()} onClick={() => onSubmit(reason.trim())}>تأكيد</button>
        </>
      )}>
      {extra}
      <Field label={label} required hint="سبب إلزامي يُحفظ في سجل التدقيق غير القابل للتعديل">
        <textarea rows="3" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="اذكر السبب بوضوح..." />
      </Field>
    </Modal>
  );
}

function ResultsAdmin({ focusComp, go }) {
  const { state, actions } = useLeague();
  const pending = state.competitions.filter((c) => c.status === "PENDING_APPROVAL");
  const approved = state.competitions.filter((c) => c.status === "COMPLETED" && c.results);
  const [activeId, setActiveId] = useState(focusComp || pending[0]?.id || "");
  const [rule, setRule] = useState("third");
  const [confirm, setConfirm] = useState(false);
  const [adjust, setAdjust] = useState(false);
  const [adjStudent, setAdjStudent] = useState("");
  const [adjPoints, setAdjPoints] = useState("");
  const comp = state.competitions.find((c) => c.id === activeId) || pending[0] || approved[0];
  const preview = useMemo(() => comp ? rankCompetition(state, comp) : null, [state, comp]);
  const [reasonFor, setReasonFor] = useState(null);

  useEffect(() => { if (focusComp) setActiveId(focusComp); }, [focusComp]);

  if (!comp) return <Empty icon="shield" title="لا توجد مسابقات للمراجعة" text="ستظهر هنا المسابقات التي انتهى تصويتها وتنتظر الاعتماد." />;

  const adjustAction = () => {
    const r = actions.adjustPoints(comp.id, Number(adjStudent), Number(adjPoints), reasonFor);
    if (r.ok) { setReasonFor(null); setAdjust(false); setAdjStudent(""); setAdjPoints(""); }
  };

  return (
    <div className="lg-admin-results">
      <div className="lg-admin-split">
        <div className="lg-admin-list">
          <SectionHead title="بانتظار الاعتماد" sub={`${pending.length} مسابقة`} />
          {pending.map((c) => (
            <button key={c.id} type="button" className={`lg-admin-item ${comp.id === c.id ? "on" : ""}`} onClick={() => setActiveId(c.id)}>
              <span className="lg-doc"><LIcon name="clock" size={15} /></span>
              <div><strong>{c.title}</strong><small>{c.submissions.length} ملخص · {c.votes.length} صوت</small></div>
              {activeId === c.id && <LIcon name="chevron-left" size={15} />}
            </button>
          ))}
          {pending.length === 0 && <p className="lg-muted sm">لا توجد مسابقات معلقة.</p>}
          <div className="lg-divider" />
          <SectionHead title="مسابقات معتمدة" sub="تعديل النقاط يتطلب سبباً" />
          {approved.slice(0, 6).map((c) => (
            <button key={c.id} type="button" className={`lg-admin-item ${comp.id === c.id ? "on" : ""}`} onClick={() => setActiveId(c.id)}>
              <span className="lg-doc green"><LIcon name="check" size={15} /></span>
              <div><strong>{c.title}</strong><small>{fmtDate(c.results.approvedAt)}</small></div>
            </button>
          ))}
        </div>

        <div className="lg-admin-detail">
          <div className="lg-admin-detail-head">
            <div>
              <Pill tone={STATUS[comp.status].tone}>{STATUS[comp.status].ar}</Pill>
              <h3>{comp.title}</h3>
              <p>{state.subjects.find((s) => s.id === comp.subjectId)?.name} · {comp.participants.length} مشارك · {comp.votes.length} صوت</p>
            </div>
            <div className="lg-admin-amount"><span>الجائزة</span><strong>{money(prizePool(comp))}</strong></div>
          </div>

          {comp.status === "PENDING_APPROVAL" && preview && (
            <>
              <div className={`lg-notice ${preview.jointFirst ? "warn" : "soft"}`}>
                <LIcon name={preview.jointFirst ? "alert" : "shield"} size={18} />
                <div>
                  <strong>{preview.jointFirst ? "تعادل مستمر على المركز الأول" : preview.firstTied?.length > 1 ? "تم كسر التعادل بالأصوات التاريخية" : "لا يوجد تعادل على المركز الأول"}</strong>
                  <p>{preview.tieNotes}</p>
                </div>
              </div>

              <div className="lg-table-wrap">
                <table className="lg-table">
                  <thead><tr><th>المركز</th><th>الطالب</th><th>الأصوات</th><th>الأصوات التاريخية</th><th>النقاط</th></tr></thead>
                  <tbody>
                    {preview.ranking.map((r, i) => (
                      <tr key={i}>
                        <td><span className={`lg-rank-badge ${r.rank <= 3 ? `r${r.rank}` : ""}`}>{r.joint ? "🥇 مشترك" : `#${r.rank}`}</span></td>
                        <td>{state.students.find((s) => s.id === r.studentId)?.name}</td>
                        <td><b>{r.votes}</b></td>
                        <td>{preview.firstTied?.length > 1 ? (r.historical ?? "—") : "—"}</td>
                        <td><b className="lg-points">+{r.points}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {preview.jointFirst && (
                <div className="lg-form-row">
                  <Field label="قاعدة المركز التالي بعد الأول المشترك">
                    <select value={rule} onChange={(e) => setRule(e.target.value)}>
                      <option value="third">اعتماد التالي كمركز ثالث (تخطي الثاني)</option>
                      <option value="second">اعتماد التالي كمركز ثانٍ (2 نقاط)</option>
                    </select>
                  </Field>
                  <div className="lg-form-note self-end"><LIcon name="info" size={16} /><p>لا يختار النظام فائزاً منفرداً عند التعادل المستمر. القرار النهائي للمركز التالي يعتمده المدير.</p></div>
                </div>
              )}

              <div className="lg-admin-actions row">
                <button type="button" className="lg-btn primary" onClick={() => setConfirm(true)}>
                  <LIcon name="check" size={15} /> اعتماد النتائج النهائية
                </button>
                <button type="button" className="lg-btn ghost" onClick={() => go("competitions", { compId: comp.id })}>فتح صفحة المسابقة</button>
              </div>
            </>
          )}

          {comp.results && (
            <>
              <div className="lg-approved-band">
                <LIcon name="check" size={16} />
                <span>معتمدة في {fmtDate(comp.results.approvedAt)} بواسطة {comp.results.approvedBy}</span>
                <Pill tone={comp.results.jointFirst ? "amber" : "green"}>{comp.results.jointFirst ? "مركز أول مشترك" : "فائز منفرد"}</Pill>
              </div>
              <div className="lg-table-wrap">
                <table className="lg-table">
                  <thead><tr><th>المركز</th><th>الطالب</th><th>الأصوات</th><th>النقاط</th><th>تعديل</th></tr></thead>
                  <tbody>
                    {comp.results.ranking.map((r, i) => (
                      <tr key={i}>
                        <td>#{r.rank}{r.joint ? " مشترك" : ""}</td>
                        <td>{state.students.find((s) => s.id === r.studentId)?.name}</td>
                        <td>{r.votes}</td>
                        <td><b className="lg-points">+{r.points}</b></td>
                        <td>
                          <button type="button" className="lg-link" onClick={() => { setAdjStudent(r.studentId); setAdjust(true); }}>تعديل النقاط</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {comp.results.jointFirst && (
                <div className="lg-notice warn">
                  <LIcon name="clock" size={18} />
                  <div>
                    <strong>الجائزة {comp.results.prize.status === "DELIVERED" ? "سُجلت تسويتها" : "معلقة"}</strong>
                    <p>{comp.results.prize.notes}</p>
                  </div>
                  <button type="button" className="lg-btn ghost sm" onClick={() => go("admin", { tab: "finance", competitionId: comp.id })}>السجل المالي</button>
                </div>
              )}
              <div className="lg-audit-mini">
                {state.audit.filter((a) => a.target === comp.id).slice(0, 3).map((a) => (
                  <div key={a.id}><span>{fmtDate(a.at, true)}</span><strong>{a.action}</strong><small>{a.actor}{a.reason ? ` — ${a.reason}` : ""}</small></div>
                ))}
              </div>
            </>
          )}

          {!comp.results && comp.status !== "PENDING_APPROVAL" && (
            <Empty icon="clock" title="النتائج غير جاهزة" text="يجب أن تنتهي مرحلة التصويت أولاً ثم تنتقل المسابقة إلى «بانتظار الاعتماد»." />
          )}
        </div>
      </div>

      {confirm && (
        <Modal title="اعتماد النتائج النهائية" subtitle="سيتم إعلان الهويات ومنح النقاط ونشر النتائج" onClose={() => setConfirm(false)}
          footer={(
            <>
              <button type="button" className="lg-btn ghost" onClick={() => setConfirm(false)}>إلغاء</button>
              <button type="button" className="lg-btn primary" onClick={() => { const r = actions.approveResults(comp.id, rule); if (r.ok) setConfirm(false); }}>
                <LIcon name="check" size={15} /> نعم، اعتمد
              </button>
            </>
          )}>
          <p className="lg-muted">هذا الإجراء نهائي: يكشف هويات المؤلفين، يمنح نقاط المركز الأول/الثاني/الثالث (3/2/1)، ويُسجل في سجل التدقيق. لا يمكن الاعتماد مرتين.</p>
          {preview?.jointFirst && <div className="lg-form-note"><LIcon name="alert" size={16} /><p>المركز الأول مشترك: سيحصل كل فائز على 3 نقاط، وتبقى الجائزة معلقة حتى تسجيل الاتفاق.</p></div>}
        </Modal>
      )}

      {adjust && (
        <Modal title="تعديل نقاط بعد الاعتماد" onClose={() => setAdjust(false)} size="sm"
          footer={(
            <>
              <button type="button" className="lg-btn ghost" onClick={() => setAdjust(false)}>إلغاء</button>
              <button type="button" className="lg-btn primary" onClick={() => setReasonFor({ studentId: adjStudent, points: adjPoints })}>متابعة</button>
            </>
          )}>
          <Field label="الطالب"><select value={adjStudent} onChange={(e) => setAdjStudent(e.target.value)}>{comp.results.ranking.map((r) => <option key={r.studentId} value={r.studentId}>{state.students.find((s) => s.id === r.studentId)?.name}</option>)}</select></Field>
          <Field label="قيمة التعديل" hint="بين -3 و+3"><input type="number" min="-3" max="3" value={adjPoints} onChange={(e) => setAdjPoints(e.target.value)} /></Field>
        </Modal>
      )}

      {reasonFor && (
        <ReasonModal title="سبب تعديل النقاط" label="السبب الإلزامي" onClose={() => setReasonFor(null)} onSubmit={adjustAction} />
      )}
    </div>
  );
}

function FinanceAdmin({ focusComp }) {
  const { state, actions, setToast } = useLeague();
  const [compId, setCompId] = useState(focusComp || state.competitions[0]?.id);
  const [settle, setSettle] = useState(false);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [recipients, setRecipients] = useState([]);
  const comp = state.competitions.find((c) => c.id === compId) || state.competitions[0];
  const prize = comp?.results?.prize;

  useEffect(() => { if (focusComp) setCompId(focusComp); }, [focusComp]);
  if (!comp) return <Empty title="لا توجد مسابقات" />;

  const paid = comp.participants.filter((p) => p.paymentStatus === "PAID");
  const exportCsv = () => {
    downloadCsv([
      ["المسابقة", "المادة", "الطالب", "المساهمة", "الحالة", "تاريخ السداد", "التحقق"],
      ...comp.participants.map((p) => [
        comp.title, state.subjects.find((s) => s.id === comp.subjectId)?.name,
        state.students.find((s) => s.id === p.studentId)?.name, comp.fee,
        p.paymentStatus, p.paidAt ? fmtDate(p.paidAt, true) : "", p.verifiedBy || "",
      ]),
    ], `finance-${comp.id}.csv`);
    setToast({ type: "success", text: "تم تصدير السجل المالي بصيغة CSV." });
  };

  const submitSettlement = () => {
    const r = actions.settleJointPrize(comp.id, {
      amount: Number(amount), notes, recipients,
      date: new Date().toISOString().slice(0, 10),
    });
    if (r.ok) { setSettle(false); setAmount(""); setNotes(""); setRecipients([]); }
  };

  return (
    <div className="lg-finance">
      <div className="lg-admin-toolbar">
        <div>
          <SectionHead title="السجل المالي والجوائز" sub="المساهمة 10 ج.م لكل مشارك، والجائزة = عدد المسددين × قيمة المساهمة" />
        </div>
        <select className="lg-select" value={comp.id} onChange={(e) => setCompId(e.target.value)}>
          {state.competitions.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      <div className="lg-finance-cards">
        <div className="lg-fin-card"><span>إجمالي المجموع</span><strong>{money(paid.length * comp.fee)}</strong><small>{paid.length} مسدد من {comp.participants.length}</small></div>
        <div className="lg-fin-card"><span>المساهمة</span><strong>{money(comp.fee)}</strong><small>لكل مشارك مسجل</small></div>
        <div className="lg-fin-card"><span>حالة الجائزة</span><strong>{prize ? (prize.status === "DELIVERED" ? "مسلمة" : prize.status === "ON_HOLD_FOR_JOINT_WINNER_AGREEMENT" ? "معلقة" : "بانتظار التسليم") : "—"}</strong><small>{prize ? money(prize.total) : "لا توجد نتائج"}</small></div>
        <div className="lg-fin-card"><span>الجائزة المستلمة</span><strong>{prize?.settlements?.reduce((a, s) => a + s.amount, 0) || (prize?.status === "DELIVERED" ? prize.total : 0)}</strong><small>ج.م موثقة</small></div>
      </div>

      <div className="lg-panel">
        <SectionHead title="مساهمات المشاركين" sub="تأكيد أو إلغاء السداد مع تسجيل التدقيق"
          action={<button type="button" className="lg-btn ghost sm" onClick={exportCsv}><LIcon name="download" size={14} /> تصدير CSV</button>} />
        <div className="lg-table-wrap">
          <table className="lg-table">
            <thead><tr><th>الطالب</th><th>الحالة</th><th>تاريخ السداد</th><th>التحقق</th><th>إجراء</th></tr></thead>
            <tbody>
              {comp.participants.map((p) => {
                const st = state.students.find((s) => s.id === p.studentId);
                return (
                  <tr key={p.studentId}>
                    <td><div className="lg-person"><Avatar name={st?.name} size={28} /><strong>{st?.name}</strong></div></td>
                    <td><Pill tone={p.paymentStatus === "PAID" ? "green" : "amber"}>{p.paymentStatus === "PAID" ? "مدفوعة" : "غير مدفوعة"}</Pill></td>
                    <td>{p.paidAt ? fmtDate(p.paidAt, true) : "—"}</td>
                    <td>{p.verifiedBy || "—"}</td>
                    <td>
                      <button type="button" className="lg-link" onClick={() => actions.markPayment(comp.id, p.studentId, p.paymentStatus === "PAID" ? "UNPAID" : "PAID")}>
                        {p.paymentStatus === "PAID" ? "إلغاء السداد" : "تأكيد السداد"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {comp.participants.length === 0 && <tr><td colSpan="5" className="lg-muted">لا يوجد مشاركون.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="lg-panel">
        <SectionHead title="الجائزة والتسويات" />
        {!prize ? <p className="lg-muted sm">لا توجد نتائج معتمدة لهذه المسابقة.</p> : (
          <div className="lg-prize-panel">
            <div className="lg-prize-info">
              <span className={`lg-prize-status ${prize.status}`}>{prize.status === "DELIVERED" ? "مسلمة" : prize.status === "ON_HOLD_FOR_JOINT_WINNER_AGREEMENT" ? "معلقة بانتظار الاتفاق" : "بانتظار التسليم"}</span>
              <h3>{money(prize.total)}</h3>
              <p>الفائزون: {prize.winnerIds.map((id) => state.students.find((s) => s.id === id)?.name).join(" و ")}</p>
              <p className="lg-muted sm">{prize.notes}</p>
              <div className="lg-prize-actions">
                {comp.results.jointFirst ? (
                  <button type="button" className="lg-btn primary" onClick={() => { setSettle(true); setAmount(prize.total); setRecipients(prize.winnerIds); }} disabled={prize.status === "DELIVERED"}>
                    <LIcon name="coin" size={15} /> تسجيل اتفاق الفائزين
                  </button>
                ) : (
                  <button type="button" className="lg-btn primary" onClick={() => actions.deliverPrize(comp.id)} disabled={prize.status === "DELIVERED"}>
                    <LIcon name="check" size={15} /> تسجيل تسليم الجائزة
                  </button>
                )}
              </div>
            </div>
            <div className="lg-prize-settlements">
              <h4>سجل التسويات</h4>
              {(prize.settlements || []).length === 0 && <p className="lg-muted sm">لم تُسجل تسويات يدوية بعد.</p>}
              {prize.settlements.map((s) => (
                <div key={s.id} className="lg-settlement">
                  <div><strong>{money(s.amount)}</strong><small>{fmtDate(s.date)} · {s.admin}</small></div>
                  <p>{s.notes}</p>
                  <span>{s.recipients.map((id) => state.students.find((x) => x.id === id)?.name).join("، ")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {settle && (
        <Modal title="تسجيل تسوية المركز الأول المشترك" subtitle="اتفاق متبادل بين الفائزين والإدارة — لا يتم التقسيم تلقائياً" onClose={() => setSettle(false)}
          footer={(
            <>
              <button type="button" className="lg-btn ghost" onClick={() => setSettle(false)}>إلغاء</button>
              <button type="button" className="lg-btn primary" onClick={submitSettlement}>تسجيل التسوية</button>
            </>
          )}>
          <div className="lg-form">
            <Field label="المبلغ المتفق عليه (ج.م)" required><input type="number" min="1" max={prize?.total} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
            <Field label="المستلمون" required>
              <div className="lg-check-list">
                {prize?.winnerIds.map((id) => (
                  <label key={id} className="lg-checkbox-row">
                    <input type="checkbox" checked={recipients.includes(id)} onChange={() => setRecipients((r) => r.includes(id) ? r.filter((x) => x !== id) : [...r, id])} />
                    {state.students.find((s) => s.id === id)?.name}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="ملاحظات الاتفاق" required><textarea rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ما هو الاتفاق المتبادل الذي تم التوصل إليه؟" /></Field>
            <div className="lg-form-note"><LIcon name="shield" size={16} /><p>سيُسجل المبلغ والمستلمون والتاريخ والمدير والملاحظات في السجل المالي وسجل التدقيق بشكل دائم.</p></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RolesAdmin() {
  const { state, actions } = useLeague();
  const [modal, setModal] = useState(null); // {type, studentId}

  const handle = (reason) => {
    if (!modal) return;
    if (modal.type === "grant") actions.grantContributor(modal.studentId, reason);
    if (modal.type === "revoke") actions.revokeContributor(modal.studentId, reason);
    if (modal.type === "editor-on") actions.setEditor(modal.studentId, true, reason);
    if (modal.type === "editor-off") actions.setEditor(modal.studentId, false, reason);
    setModal(null);
  };

  return (
    <div className="lg-roles">
      <SectionHead title="الأدوار والشارات" sub="الفصل بين شارات الإنجاز والأدوار الوظيفية — الشارة لا تمنح صلاحيات" />
      <div className="lg-role-legend">
        <div><span>✍️</span><strong>Summary Contributor</strong><p>شارة تقدير فقط. لا تمنح أي صلاحية إدارية.</p></div>
        <div><span>📝</span><strong>Summary Editor</strong><p>دور وظيفي للمراجعة الأولية واقتراح التعديلات، دون اعتماد أو نشر.</p></div>
      </div>
      <div className="lg-table-wrap">
        <table className="lg-table">
          <thead><tr><th>الطالب</th><th>الكود</th><th>الشارات</th><th>الدور</th><th>إجراءات</th></tr></thead>
          <tbody>
            {state.students.map((s) => (
              <tr key={s.id}>
                <td><div className="lg-person"><Avatar name={s.name} size={28} /><strong>{s.name}</strong></div></td>
                <td><code>{s.code}</code></td>
                <td><div className="lg-badge-mini-list">{s.badges.map((b, i) => { const badge = BADGES[b.badgeId]; return badge ? <span key={i} title={badge.ar}>{badge.icon}</span> : null; })}</div></td>
                <td>{s.editor ? <Pill tone="purple">Summary Editor</Pill> : <Pill tone="slate">طالب</Pill>}</td>
                <td>
                  <div className="lg-row-actions">
                    {s.badges.some((b) => b.badgeId === "summary_contributor") ? (
                      <button type="button" className="lg-link danger" onClick={() => setModal({ type: "revoke", studentId: s.id })}>سحب المساهم</button>
                    ) : (
                      <button type="button" className="lg-link" onClick={() => setModal({ type: "grant", studentId: s.id })}>منح المساهم</button>
                    )}
                    <button type="button" className="lg-link" onClick={() => setModal({ type: s.editor ? "editor-off" : "editor-on", studentId: s.id })}>
                      {s.editor ? "سحب المحرر" : "تعيين محرر"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="lg-rule-note"><LIcon name="shield" size={16} /><p>كل منح أو سحب يتطلب سبباً ويُنشئ سجلاً في سجل التدقيق وإشعاراً للطالب. لا يمنح امتلاك شارة Summary Contributor أي صلاحية على الواجهة أو الخدمات.</p></div>

      {modal && (
        <ReasonModal
          title={modal.type === "grant" ? "منح Summary Contributor" : modal.type === "revoke" ? "سحب Summary Contributor" : modal.type === "editor-on" ? "تعيين Summary Editor" : "سحب دور Summary Editor"}
          label="سبب الإجراء"
          onClose={() => setModal(null)}
          onSubmit={handle}
        />
      )}
    </div>
  );
}

function Moderation({ focusEntry }) {
  const { state, session, can, actions } = useLeague();
  const pending = state.library.filter((e) => e.status === "PENDING_REVIEW");
  const [activeId, setActiveId] = useState(focusEntry || pending[0]?.id || state.library[0]?.id || "");
  const [preview, setPreview] = useState(null);
  const [suggestion, setSuggestion] = useState("");
  const entry = state.library.find((e) => e.id === activeId) || pending[0] || state.library[0];
  const suggestions = entry ? state.editorSuggestions.filter((s) => s.entryId === entry.id) : [];
  const isEditorOnly = !can("summary.publish");

  useEffect(() => { if (focusEntry) setActiveId(focusEntry); }, [focusEntry]);

  if (!entry) return <Empty icon="edit" title="لا توجد ملخصات بانتظار المراجعة" text="تظهر هنا النسخ الرقمية التي يرسلها الفائزون." />;

  return (
    <div className="lg-moderation">
      <div className="lg-admin-split">
        <div className="lg-admin-list">
          <SectionHead title="قائمة المراجعة الأولية" sub={isEditorOnly ? "دور المحرر: اقتراح فقط" : `${pending.length} بانتظار النشر`} />
          {pending.map((e) => (
            <button key={e.id} type="button" className={`lg-admin-item ${entry.id === e.id ? "on" : ""}`} onClick={() => setActiveId(e.id)}>
              <span className="lg-doc"><LIcon name="file" size={15} /></span>
              <div><strong>{e.title}</strong><small>{state.students.find((s) => s.id === e.studentId)?.name}</small></div>
            </button>
          ))}
          {pending.length === 0 && <p className="lg-muted sm">لا توجد ملخصات قيد المراجعة.</p>}
          <div className="lg-divider" />
          <SectionHead title="منشورة" sub="أرشيف المكتبة" />
          {state.library.filter((e) => e.status === "PUBLISHED").slice(0, 5).map((e) => (
            <button key={e.id} type="button" className={`lg-admin-item ${entry.id === e.id ? "on" : ""}`} onClick={() => setActiveId(e.id)}>
              <span className="lg-doc green"><LIcon name="book" size={15} /></span>
              <div><strong>{e.title}</strong><small>{fmtDate(e.publishedAt)}</small></div>
            </button>
          ))}
        </div>

        <div className="lg-admin-detail">
          <div className="lg-admin-detail-head">
            <div>
              <Pill tone={entry.status === "PUBLISHED" ? "green" : "amber"}>{entry.status === "PUBLISHED" ? "منشور" : "قيد المراجعة"}</Pill>
              <h3>{entry.title}</h3>
              <p>{state.students.find((s) => s.id === entry.studentId)?.name} · {state.subjects.find((s) => s.id === entry.subjectId)?.name} · {entry.pages.length} صفحات</p>
            </div>
            <button type="button" className="lg-btn ghost sm" onClick={() => setPreview(entry)}><LIcon name="book" size={14} /> معاينة القارئ</button>
          </div>

          <div className="lg-review-grid">
            <div>
              <h4>الصور النهائية بخط اليد</h4>
              <div className="lg-review-thumbs">
                {(entry.finalImages?.length ? entry.finalImages : state.competitions.find((c) => c.id === entry.competitionId)?.submissions.find((s) => s.studentId === entry.studentId)?.images || []).slice(0, 4).map((src, i) => (
                  <img key={i} src={src} alt={`أصل ${i + 1}`} onClick={() => setPreview({ ...entry, pages: [{ blocks: [{ type: "image", src }] }] })} />
                ))}
              </div>
              <small className="lg-muted">قارن النسخة الرقمية بالأصل قبل الاعتماد.</small>
            </div>
            <div>
              <h4>بطاقة التوثيق</h4>
              <div className="lg-attribution-mini">
                <div><span>المؤلف</span><strong>{entry.attribution?.authorName}</strong></div>
                <div><span>المسابقة</span><strong>{entry.competitionName}</strong></div>
                <div><span>المركز</span><strong>{entry.attribution?.rankLabel}</strong></div>
                <div><span>النشر</span><strong>{entry.publishedAt ? fmtDate(entry.publishedAt) : "بعد الاعتماد"}</strong></div>
              </div>
              <div className="lg-lock-note"><LIcon name="lock" size={13} /> التوثيق مثبت ولا يمكن تعديله من المحرر.</div>
            </div>
          </div>

          <h4>اقتراحات المراجعة الأولية ({suggestions.length})</h4>
          <div className="lg-suggestions">
            {suggestions.map((s) => (
              <div key={s.id} className="lg-suggestion">
                <strong>{state.students.find((x) => x.id === s.editorId)?.name || "محرر"}</strong>
                <p>{s.text}</p>
                <small>{fmtDate(s.at, true)}</small>
              </div>
            ))}
            {suggestions.length === 0 && <p className="lg-muted sm">لا توجد اقتراحات بعد.</p>}
          </div>

          {entry.status !== "PUBLISHED" && (
            <div className="lg-suggest-form">
              <textarea rows="2" value={suggestion} onChange={(e) => setSuggestion(e.target.value)} placeholder={isEditorOnly ? "أضف اقتراحاً للمدير (لا يمكنك النشر)..." : "أضف ملاحظة مراجعة..."} />
              <button type="button" className="lg-btn ghost" disabled={!suggestion.trim()} onClick={() => { const r = actions.suggestEdit(entry.id, suggestion); if (r.ok) setSuggestion(""); }}>
                <LIcon name="edit" size={14} /> إرسال الاقتراح
              </button>
            </div>
          )}

          <div className="lg-admin-actions row">
            {can("summary.publish") && entry.status !== "PUBLISHED" && (
              <button type="button" className="lg-btn primary" onClick={() => actions.publishEntry(entry.id)}>
                <LIcon name="check" size={15} /> اعتماد ونشر في المكتبة
              </button>
            )}
            {isEditorOnly && <span className="lg-role-hint"><LIcon name="shield" size={14} /> دور المحرر لا يملك صلاحية النشر أو الاعتماد.</span>}
          </div>
        </div>
      </div>

      {preview && (
        <BookReader entry={{ ...preview, attribution: preview.attribution || {} }} onClose={() => setPreview(null)} onDownload={downloadEntryPdf} />
      )}
    </div>
  );
}

function AuditAdmin() {
  const { state } = useLeague();
  return (
    <div className="lg-audit">
      <SectionHead title="سجل التدقيق" sub="سجل غير قابل للتعديل لكل الإجراءات الحساسة" />
      <div className="lg-table-wrap">
        <table className="lg-table audit">
          <thead><tr><th>الوقت</th><th>الإجراء</th><th>المنفذ</th><th>الهدف</th><th>السبب</th><th>قبل → بعد</th></tr></thead>
          <tbody>
            {state.audit.map((a) => (
              <tr key={a.id}>
                <td>{fmtDate(a.at, true)}</td>
                <td><strong>{a.action}</strong></td>
                <td>{a.actor}</td>
                <td><code>{a.target}</code></td>
                <td>{a.reason || "—"}</td>
                <td><span className="lg-muted sm">{JSON.stringify(a.before)} → {JSON.stringify(a.after)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="lg-rule-note"><LIcon name="lock" size={16} /><p>لا يمكن حذف أو تعديل سجلات التدقيق من الواجهة. أي تعديل يدوي على نتيجة أو سجل مالي يتطلب سبباً ويضيف سطراً جديداً.</p></div>
    </div>
  );
}

function AnnualAdmin({ go }) {
  const { state, can, actions } = useLeague();
  const [confirm, setConfirm] = useState(false);
  const standings = computeStandings(state);
  return (
    <div className="lg-annual">
      <SectionHead title="العام الدراسي والأرشيف" sub="النقاط لا تُصفَّر داخل العام، والأعوام السابقة محفوظة" />
      <div className="lg-finance-cards">
        <div className="lg-fin-card"><span>العام الحالي</span><strong>{state.year.label}</strong><small>{state.yearClosed ? "مغلق ومؤرشف" : "جارٍ"}</small></div>
        <div className="lg-fin-card"><span>المتصدر</span><strong>{standings[0]?.name}</strong><small>{standings[0]?.points || 0} نقطة</small></div>
        <div className="lg-fin-card"><span>أبطال مؤرشفون</span><strong>{state.annualChampions.length}</strong><small>محفوظون دائماً</small></div>
        <div className="lg-fin-card"><span>سجلات النقاط</span><strong>{state.pointsLedger.length}</strong><small>معاملات غير قابلة للحذف</small></div>
      </div>
      <div className="lg-admin-actions">
        {can("year.close") && !state.yearClosed && (
          <button type="button" className="lg-btn primary" onClick={() => setConfirm(true)}><LIcon name="crown" size={15} /> إغلاق العام وتتويج البطل</button>
        )}
        <button type="button" className="lg-btn ghost" onClick={() => go("hall")}>فتح لوحة الشرف</button>
        <button type="button" className="lg-btn ghost danger" onClick={() => { if (window.confirm("سيتم حذف كل تغييرات الدوري والعودة للبيانات التجريبية. متابعة؟")) actions.resetDemo(); }}>
          <LIcon name="refresh" size={15} /> استعادة البيانات التجريبية
        </button>
      </div>
      <div className="lg-panel">
        <SectionHead title="أبطال الأعوام" />
        {state.annualChampions.map((c) => (
          <div key={c.yearId} className="lg-champion-row">
            <span className="lg-champion-icon"><LIcon name="crown" size={18} /></span>
            <div><strong>{state.students.find((s) => s.id === c.championId)?.name}</strong><small>{c.yearId} · {c.points} نقطة · أُرشف {fmtDate(c.archivedAt)}</small></div>
            <Pill tone={c.yearId === state.currentYearId ? "green" : "slate"}>{c.yearId}</Pill>
          </div>
        ))}
      </div>
      {confirm && (
        <Modal title="إغلاق العام الدراسي" onClose={() => setConfirm(false)}
          footer={<><button type="button" className="lg-btn ghost" onClick={() => setConfirm(false)}>إلغاء</button><button type="button" className="lg-btn primary" onClick={() => { const r = actions.closeAcademicYear(); if (r.ok) setConfirm(false); }}>تأكيد</button></>}>
          <p className="lg-muted">سيُتوج {standings[0]?.name} بلقب 404 Annual Champion ويُحفظ الترتيب في الأرشيف. لا تُحذف النقاط السابقة.</p>
        </Modal>
      )}
    </div>
  );
}

export default function AdminConsole({ route, go }) {
  const { can } = useLeague();
  const all = [
    { key: "results", label: "النتائج والاعتماد", icon: "shield", perm: "results.approve" },
    { key: "finance", label: "المالية والجوائز", icon: "coin", perm: "finance.manage" },
    { key: "roles", label: "الأدوار والشارات", icon: "users", perm: "roles.manage" },
    { key: "moderation", label: "مراجعة الملخصات", icon: "edit", perm: "summary.review" },
    { key: "audit", label: "سجل التدقيق", icon: "list", perm: "audit.view" },
    { key: "annual", label: "العام والأرشيف", icon: "crown", perm: "year.close" },
  ].filter((t) => can(t.perm));
  const [tab, setTab] = useState(route?.tab || all[0]?.key);

  useEffect(() => {
    if (route?.tab && all.some((t) => t.key === route.tab)) setTab(route.tab);
  }, [route?.tab]);

  if (!all.length) return <Empty icon="lock" title="لا تملك صلاحية الوصول" text="هذه الصفحة مخصصة لمديري المجموعة والمحررين." />;

  return (
    <div className="lg-view">
      <SectionHead title="لوحة إدارة الدوري" sub="اعتماد النتائج، المالية، الأدوار، المراجعة، والتدقيق" />
      <Tabs tabs={all} value={tab} onChange={setTab} className="lg-admin-tabs" />
      <div className="lg-admin-body">
        {tab === "results" && <ResultsAdmin focusComp={route?.competitionId} go={go} />}
        {tab === "finance" && <FinanceAdmin focusComp={route?.competitionId} />}
        {tab === "roles" && <RolesAdmin />}
        {tab === "moderation" && <Moderation focusEntry={route?.entryId} />}
        {tab === "audit" && <AuditAdmin />}
        {tab === "annual" && <AnnualAdmin go={go} />}
      </div>
    </div>
  );
}
