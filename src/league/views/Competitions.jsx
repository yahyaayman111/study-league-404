import { useMemo, useRef, useState } from "react";
import { fmtDate, fmtMoney, prizePool, STATUS, STATUS_ORDER, daysLeft, BADGES } from "../domain.js";
import { useLeague } from "../store.jsx";
import { LIcon, Modal, Pill, Field, Empty, SectionHead, Avatar } from "../ui.jsx";
import CompetitionCard from "../components/CompetitionCard.jsx";
import VotingGallery from "./VotingGallery.jsx";

const toLocal = (d) => {
  const date = new Date(d);
  const off = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - off).toISOString().slice(0, 16);
};
const addDays = (n) => toLocal(Date.now() + n * 86400000);

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1400;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => reject(new Error("صيغة الصورة غير مدعومة."));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("تعذر قراءة الملف."));
    reader.readAsDataURL(file);
  });
}

function CompetitionForm({ initial, onClose }) {
  const { state, actions } = useLeague();
  const [form, setForm] = useState(() => ({
    subjectId: initial?.subjectId || state.subjects[0]?.id || 1,
    title: initial?.title || "",
    instructions: initial?.instructions || "",
    startDate: initial ? toLocal(initial.startDate) : addDays(0),
    submissionDeadline: initial ? toLocal(initial.submissionDeadline) : addDays(2),
    votingStart: initial ? toLocal(initial.votingStart) : addDays(2),
    votingEnd: initial ? toLocal(initial.votingEnd) : addDays(5),
    fee: initial?.fee ?? 10,
  }));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      startDate: new Date(form.startDate).toISOString(),
      submissionDeadline: new Date(form.submissionDeadline).toISOString(),
      votingStart: new Date(form.votingStart).toISOString(),
      votingEnd: new Date(form.votingEnd).toISOString(),
      fee: Number(form.fee),
    };
    const res = initial ? actions.updateCompetition(initial.id, payload) : actions.createCompetition(payload);
    if (res.ok) onClose();
  };
  return (
    <Modal title={initial ? "تعديل المسابقة" : "إنشاء مسابقة أسبوعية"} subtitle="مسابقة مستقلة لمادة واحدة داخل مجموعتك" onClose={onClose} size="lg"
      footer={(
        <>
          <button type="button" className="lg-btn ghost" onClick={onClose}>إلغاء</button>
          <button type="submit" form="comp-form" className="lg-btn primary"><LIcon name="check" size={15} /> {initial ? "حفظ التعديلات" : "نشر المسابقة"}</button>
        </>
      )}>
      <form id="comp-form" className="lg-form" onSubmit={submit}>
        <div className="lg-form-row">
          <Field label="المادة الدراسية" required>
            <select value={form.subjectId} onChange={(e) => set("subjectId", e.target.value)}>
              {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="المساهمة الأسبوعية (ج.م)" required hint="تُضاف إلى الجائزة عند سداد كل مشارك">
            <input type="number" min="0" step="1" value={form.fee} onChange={(e) => set("fee", e.target.value)} />
          </Field>
        </div>
        <Field label="عنوان المسابقة / المحاضرة" required>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="مثال: المحاضرة 6: تغذية الدواجن البياضة" />
        </Field>
        <Field label="تعليمات التنسيق والمعايير العلمية">
          <textarea rows="4" value={form.instructions} onChange={(e) => set("instructions", e.target.value)} placeholder="عدد الصفحات، العناصر المطلوبة، طريقة التصوير..." />
        </Field>
        <div className="lg-form-row">
          <Field label="بداية المسابقة" required><input type="datetime-local" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
          <Field label="إغلاق التقديم" required><input type="datetime-local" value={form.submissionDeadline} onChange={(e) => set("submissionDeadline", e.target.value)} /></Field>
        </div>
        <div className="lg-form-row">
          <Field label="بداية التصويت" required><input type="datetime-local" value={form.votingStart} onChange={(e) => set("votingStart", e.target.value)} /></Field>
          <Field label="نهاية التصويت" required><input type="datetime-local" value={form.votingEnd} onChange={(e) => set("votingEnd", e.target.value)} /></Field>
        </div>
        <div className="lg-form-note">
          <LIcon name="shield" size={16} />
          <p>يُمنع تقديم الملخصات بعد الموعد النهائي، ويُمنع التصويت بعد إغلاقه. كل التحققات تُنفَّذ في طبقة الخدمات وليس في الواجهة فقط.</p>
        </div>
      </form>
    </Modal>
  );
}

function UploadModal({ comp, existing, onClose }) {
  const { actions } = useLeague();
  const [images, setImages] = useState(existing?.images || []);
  const [notes, setNotes] = useState(existing?.notes || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef(null);

  const addFiles = async (files) => {
    setErr("");
    const next = [...images];
    for (const file of files) {
      if (next.length >= 6) { setErr("الحد الأقصى 6 صور."); break; }
      if (!file.type.startsWith("image/")) { setErr("الملفات المسموحة صور فقط (JPG/PNG)."); continue; }
      if (file.size > 12 * 1024 * 1024) { setErr("حجم الصورة كبير جداً (الحد 12 ميجابايت)."); continue; }
      try { next.push(await compressImage(file)); } catch (e) { setErr(e.message); }
    }
    setImages(next);
  };

  const submit = () => {
    setBusy(true);
    const res = actions.submitSummary(comp.id, { images, notes });
    setBusy(false);
    if (res.ok) onClose();
  };

  return (
    <Modal title={existing ? "استبدال الملخص" : "تقديم ملخص بخط اليد"} subtitle="صور واضحة وعالية الدقة للملخص المكتوب بخط اليد" onClose={onClose} size="lg"
      footer={(
        <>
          <button type="button" className="lg-btn ghost" onClick={onClose}>إلغاء</button>
          <button type="button" className="lg-btn primary" disabled={busy || !images.length} onClick={submit}>
            <LIcon name="upload" size={15} /> {busy ? "جارٍ الرفع..." : existing ? "استبدال الملخص" : "رفع الملخص"}
          </button>
        </>
      )}>
      <div className="lg-upload">
        <button type="button" className="lg-dropzone" onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles([...e.dataTransfer.files]); }}>
          <LIcon name="upload" size={26} />
          <strong>اضغط لاختيار الصور أو اسحبها هنا</strong>
          <small>JPG / PNG — حتى 6 صفحات</small>
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles([...e.target.files])} />
        {images.length > 0 && (
          <div className="lg-thumb-grid">
            {images.map((src, i) => (
              <div className="lg-thumb" key={i}>
                <img src={src} alt={`صفحة ${i + 1}`} />
                <span>صفحة {i + 1}</span>
                <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))} aria-label="حذف"><LIcon name="x" size={13} /></button>
              </div>
            ))}
          </div>
        )}
        <Field label="ملاحظات اختيارية" hint="ستظهر مع الملخص بعد فتح التصويت">
          <textarea rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثال: اعتمدت على المراجع المرفقة في نهاية المحاضرة." />
        </Field>
        {err && <div className="lg-form-error"><LIcon name="alert" size={15} />{err}</div>}
        <div className="lg-form-note">
          <LIcon name="eyeoff" size={16} />
          <p>أثناء فترة التقديم لا يستطيع أي طالب رؤية ملخصات الآخرين. تظهر جميعها لاحقاً بأرقام محايدة دون كشف الهوية.</p>
        </div>
      </div>
    </Modal>
  );
}

function PublishModal({ comp, studentId, onClose, go }) {
  const { state, actions } = useLeague();
  const [form, setForm] = useState({
    title: comp.title.replace(/^[^:]+:\s*/, ""),
    text: "## مقدمة\nاكتب هنا النسخة الرقمية من الملخص...\n\n## النقاط الرئيسية\n- النقطة الأولى\n- النقطة الثانية\n\n> ملاحظة: قارن النسخة الرقمية بالصور الأصلية قبل النشر.",
  });
  const [images, setImages] = useState([]);
  const inputRef = useRef(null);
  const submit = () => {
    const res = actions.submitWinningSummary(comp.id, { ...form, studentId, images });
    if (res.ok) { onClose(); go?.("admin", { tab: "moderation" }); }
  };
  return (
    <Modal title="رفع ونشر الملخص الفائز" subtitle="سيُراجع مدير المجموعة النسخة الرقمية مقابل الأصل قبل النشر" onClose={onClose} size="lg"
      footer={(
        <>
          <button type="button" className="lg-btn ghost" onClick={onClose}>إلغاء</button>
          <button type="button" className="lg-btn primary" onClick={submit}><LIcon name="upload" size={15} /> إرسال للمراجعة</button>
        </>
      )}>
      <div className="lg-form">
        <Field label="عنوان الملخص" required><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="النسخة الرقمية" hint="يدعم العناوين (#)، النقاط (-)، والملاحظات (>). ستُقسَّم تلقائياً إلى صفحات في قارئ الكتاب.">
          <textarea rows="9" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
        </Field>
        <Field label="الصور النهائية بخط اليد (اختياري)">
          <div className="lg-publish-images">
            {images.map((src, i) => <img key={i} src={src} alt="" onClick={() => setImages(images.filter((_, j) => j !== i))} title="اضغط للحذف" />)}
            <button type="button" className="lg-add-image" onClick={() => inputRef.current?.click()}><LIcon name="plus" size={16} /></button>
            <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={async (e) => {
              const out = [...images];
              for (const file of [...e.target.files]) out.push(await compressImage(file));
              setImages(out.slice(0, 6));
            }} />
          </div>
        </Field>
        <div className="lg-form-note">
          <LIcon name="lock" size={16} />
          <p>بطاقة التوثيق (المادة، المحاضرة، المؤلف، التاريخ، المسابقة، المركز) تُضاف تلقائياً من نتائج المسابقة المعتمدة، ولا يمكن تعديلها من المحرر.</p>
        </div>
      </div>
    </Modal>
  );
}

function ResultsView({ comp, go }) {
  const { state, student, actions } = useLeague();
  const { results } = comp;
  const prize = results.prize;
  return (
    <div className="lg-results">
      <div className={`lg-notice ${results.jointFirst ? "warn" : "success"}`}>
        <LIcon name={results.jointFirst ? "alert" : "trophy"} size={20} />
        <div>
          <strong>{results.jointFirst ? "المركز الأول مشترك" : "النتائج النهائية معتمدة"}</strong>
          <p>{results.tieNotes}</p>
        </div>
      </div>

      <div className="lg-table-wrap">
        <table className="lg-table results">
          <thead><tr><th>المركز</th><th>الطالب</th><th>الأصوات</th><th>النقاط</th><th>الملخص</th></tr></thead>
          <tbody>
            {results.ranking.map((r) => {
              const st = state.students.find((s) => s.id === r.studentId);
              const entry = state.library.find((e) => e.competitionId === comp.id && e.studentId === r.studentId && e.status === "PUBLISHED");
              return (
                <tr key={`${r.studentId}-${r.rank}`}>
                  <td><span className={`lg-rank-badge r${r.rank}`}>{r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : "🥉"} {r.rank === 1 && r.joint ? "مشترك" : `#${r.rank}`}</span></td>
                  <td><div className="lg-person"><Avatar name={st?.name} size={28} /><strong>{st?.name}</strong></div></td>
                  <td>{r.votes}</td>
                  <td><b className="lg-points">+{r.points}</b></td>
                  <td>
                    {entry ? <button type="button" className="lg-link" onClick={() => go("library", { entryId: entry.id })}>قراءة في المكتبة <LIcon name="chevron-left" size={13} /></button>
                      : <span className="lg-muted sm">{r.rank === 1 ? "لم يُنشر بعد" : "—"}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="lg-result-grid">
        <div className="lg-result-box">
          <LIcon name="coin" size={18} />
          <div>
            <span>الجائزة المالية</span>
            <strong>{fmtMoney(prize.total)}</strong>
            <small>{prize.status === "DELIVERED" ? `سُلمت ${fmtDate(prize.deliveredAt)}` : prize.status === "ON_HOLD_FOR_JOINT_WINNER_AGREEMENT" ? "معلقة بانتظار اتفاق الفائزين" : "بانتظار التسليم"}</small>
          </div>
        </div>
        <div className="lg-result-box">
          <LIcon name="shield" size={18} />
          <div>
            <span>قاعدة كسر التعادل</span>
            <strong>{results.jointFirst ? "تعادل مستمر" : "لا تعادل"}</strong>
            <small>الأصوات التاريخية في المواد الأخرى</small>
          </div>
        </div>
        <div className="lg-result-box">
          <LIcon name="calendar" size={18} />
          <div>
            <span>تاريخ الاعتماد</span>
            <strong>{fmtDate(results.approvedAt)}</strong>
            <small>بواسطة {results.approvedBy}</small>
          </div>
        </div>
      </div>

      {results.jointFirst && prize.status === "ON_HOLD_FOR_JOINT_WINNER_AGREEMENT" && (
        <div className="lg-notice warn">
          <LIcon name="clock" size={18} />
          <div>
            <strong>الجائزة على وضع الانتظار</strong>
            <p>لا يتم تقسيم الجائزة تلقائياً. يسجل مدير المجموعة الاتفاق المتبادل في السجل المالي بعد أن يتفق الفائزان مع الإدارة.</p>
          </div>
          <button type="button" className="lg-btn ghost sm" onClick={() => go("admin", { tab: "finance", competitionId: comp.id })}>فتح السجل المالي</button>
        </div>
      )}

      {student && results.ranking.some((r) => r.studentId === student.id && r.rank === 1) && (
        <WinnerPublish comp={comp} studentId={student.id} go={go} />
      )}
    </div>
  );
}

function WinnerPublish({ comp, studentId, go }) {
  const { state } = useLeague();
  const entry = state.library.find((e) => e.competitionId === comp.id && e.studentId === studentId);
  const [open, setOpen] = useState(false);
  if (entry) {
    return (
      <div className="lg-notice soft">
        <LIcon name="book" size={18} />
        <div>
          <strong>{entry.status === "PUBLISHED" ? "ملخصك منشور في المكتبة" : "ملخصك الفائز قيد المراجعة"}</strong>
          <p>{entry.status === "PUBLISHED" ? "يمكنك قراءته وتحميله بصيغة PDF." : "يراجع مدير المجموعة النسخة الرقمية قبل النشر."}</p>
        </div>
        {entry.status === "PUBLISHED" && <button type="button" className="lg-btn ghost sm" onClick={() => go("library", { entryId: entry.id })}>فتح المكتبة</button>}
      </div>
    );
  }
  return (
    <>
      <div className="lg-notice soft">
        <LIcon name="medal" size={18} />
        <div>
          <strong>أنت مؤهل لنشر ملخصك الفائز</strong>
          <p>حوّل ملخصك إلى النسخة الرقمية الرسمية ليدخل مكتبة المادة بعد اعتماد مدير المجموعة.</p>
        </div>
        <button type="button" className="lg-btn primary sm" onClick={() => setOpen(true)}>رفع ونشر الملخص</button>
      </div>
      {open && <PublishModal comp={comp} studentId={studentId} onClose={() => setOpen(false)} go={go} />}
    </>
  );
}

function CompetitionDetail({ compId, go, onBack }) {
  const { state, session, student, actions, can, subjectById } = useLeague();
  const comp = state.competitions.find((c) => c.id === compId);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [existing, setExisting] = useState(null);

  if (!comp) return <Empty title="المسابقة غير موجودة" action={<button type="button" className="lg-btn ghost" onClick={onBack}>رجوع</button>} />;
  const subject = subjectById(comp.subjectId);
  const status = STATUS[comp.status];
  const p = comp.participants.find((x) => x.studentId === student?.id);
  const own = comp.submissions.find((s) => s.studentId === student?.id);
  const isAdmin = can("competition.manage");
  const stepIndex = STATUS_ORDER.indexOf(comp.status);
  const entry = state.library.find((e) => e.competitionId === comp.id && e.status === "PUBLISHED");
  const isWinner = comp.results?.ranking.some((r) => r.studentId === student?.id && r.rank === 1);

  return (
    <div className="lg-view">
      <button type="button" className="lg-back" onClick={onBack}><LIcon name="arrow" size={15} /> ساحة المسابقات</button>
      <section className="lg-comp-head">
        <div className="lg-comp-head-main">
          <div className="lg-comp-head-top">
            <span className={`lg-subject-icon lg big ${subject?.color}`} aria-hidden="true">{subject?.icon}</span>
            <div>
              <div className="lg-crumbs">{subject?.name} <span>·</span> {state.group.name}</div>
              <h1>{comp.title}</h1>
            </div>
            <Pill tone={status.tone}>{status.ar}</Pill>
          </div>
          {comp.instructions && <p className="lg-comp-instructions">{comp.instructions}</p>}
          <div className="lg-comp-head-meta">
            <span><LIcon name="calendar" size={14} /> النشر {fmtDate(comp.createdAt)}</span>
            <span><LIcon name="clock" size={14} /> التقديم حتى {fmtDate(comp.submissionDeadline, true)}</span>
            <span><LIcon name="eye" size={14} /> التصويت حتى {fmtDate(comp.votingEnd, true)}</span>
            <span><LIcon name="coin" size={14} /> {fmtMoney(prizePool(comp))} جائزة</span>
          </div>
        </div>
        <div className="lg-comp-head-side">
          <div className="lg-fact"><span>المشاركون</span><strong>{comp.participants.length}</strong></div>
          <div className="lg-fact"><span>الملخصات</span><strong>{comp.submissions.length}</strong></div>
          <div className="lg-fact"><span>المساهمة</span><strong>{fmtMoney(comp.fee)}</strong></div>
          <div className="lg-fact"><span>المتبقي</span><strong>{daysLeft(comp.status === "VOTING_OPEN" ? comp.votingEnd : comp.submissionDeadline)}</strong></div>
        </div>
      </section>

      <div className="lg-steps">
        {STATUS_ORDER.map((key, i) => (
          <div key={key} className={`lg-step ${i < stepIndex ? "done" : ""} ${i === stepIndex ? "active" : ""}`}>
            <span className="lg-step-dot">{i < stepIndex ? <LIcon name="check" size={12} /> : i + 1}</span>
            <div><strong>{STATUS[key].ar}</strong><small>{key === "SUBMISSION_OPEN" ? fmtDate(comp.submissionDeadline) : key === "VOTING_OPEN" ? fmtDate(comp.votingEnd) : key === "UPCOMING" ? fmtDate(comp.startDate) : ""}</small></div>
          </div>
        ))}
      </div>

      <div className="lg-detail-grid">
        <div className="lg-detail-main">
          {comp.status === "COMPLETED" && comp.results && <ResultsView comp={comp} go={go} />}

          {(comp.status === "VOTING_OPEN" || comp.status === "PENDING_APPROVAL") && (
            <section className="lg-panel">
              <SectionHead title="معرض الملخصات" sub={comp.status === "VOTING_OPEN" ? "اقرأ ثم اختر حتى 3 ملخصات مختلفة" : "انتهى التصويت — بانتظار اعتماد النتائج"} />
              <VotingGallery comp={comp} />
            </section>
          )}

          {comp.status === "SUBMISSION_OPEN" && (
            <section className="lg-panel">
              <SectionHead title="تقديم الملخص" sub="صور بخط اليد — تظهر فقط بعد فتح التصويت" />
              {!student ? (
                <Empty icon="lock" title="سجّل الدخول كطالب للمشاركة" text="حساب الإدارة لا يشارك في المسابقات أو التصويت." />
              ) : !p ? (
                <Empty icon="users" title="لم تنضم للمسابقة بعد" text="انضم أولاً من بطاقة المشاركة، ثم سدد المساهمة لتتمكن من رفع ملخصك."
                  action={<button type="button" className="lg-btn primary sm" onClick={() => actions.joinCompetition(comp.id)}>انضم الآن</button>} />
              ) : p.paymentStatus !== "PAID" ? (
                <Empty icon="coin" title="المساهمة غير مسددة" text={`المطلوب ${fmtMoney(comp.fee)} للمشاركة في هذه المسابقة.`}
                  action={<button type="button" className="lg-btn primary sm" onClick={() => actions.payContribution(comp.id)}>دفع المساهمة (تجريبي)</button>} />
              ) : own ? (
                <div className="lg-submitted">
                  <div className="lg-submitted-head">
                    <span className="lg-doc big"><LIcon name="check" size={18} /></span>
                    <div><strong>تم استلام ملخصك</strong><small>{own.images.length} صفحات · آخر تحديث {fmtDate(own.submittedAt, true)}</small></div>
                    <Pill tone="green">مرفوع</Pill>
                  </div>
                  <div className="lg-thumb-grid">
                    {own.images.map((src, i) => <div className="lg-thumb" key={i}><img src={src} alt="" /><span>صفحة {i + 1}</span></div>)}
                  </div>
                  <p className="lg-muted sm">يمكنك استبدال الملخص قبل {fmtDate(comp.submissionDeadline, true)}. ملخصك لن يظهر للآخرين قبل فتح التصويت.</p>
                  <button type="button" className="lg-btn ghost" onClick={() => { setExisting(own); setUploadOpen(true); }}><LIcon name="upload" size={15} /> استبدال الملخص</button>
                  {uploadOpen && <UploadModal comp={comp} existing={existing} onClose={() => setUploadOpen(false)} />}
                </div>
              ) : (
                <div className="lg-upload-cta">
                  <div className="lg-upload-illustration"><LIcon name="pen" size={28} /></div>
                  <div>
                    <strong>ارفع صور ملخصك بخط اليد</strong>
                    <p>حتى 6 صور واضحة. آخر موعد {fmtDate(comp.submissionDeadline, true)}.</p>
                  </div>
                  <button type="button" className="lg-btn primary" onClick={() => { setExisting(null); setUploadOpen(true); }}>
                    <LIcon name="upload" size={15} /> رفع الملخص
                  </button>
                </div>
              )}
            </section>
          )}

          {comp.status === "UPCOMING" && (
            <section className="lg-panel">
              <div className="lg-upcoming-hero">
                <div className="lg-upcoming-clock"><LIcon name="clock" size={30} /></div>
                <div>
                  <h3>المسابقة تبدأ {fmtDate(comp.startDate, true)}</h3>
                  <p>يمكنك الانضمام الآن وسداد المساهمة استعداداً لاستقبال الملخصات.</p>
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="lg-detail-side">
          <section className="lg-panel">
            <SectionHead title="مشاركتك" />
            {!student ? (
              <p className="lg-muted sm">سجّل الدخول كطالب للمشاركة والتصويت.</p>
            ) : p ? (
              <div className="lg-participation">
                <div className="lg-participation-row"><span>حالة التسجيل</span><Pill tone="green">مسجل</Pill></div>
                <div className="lg-participation-row"><span>المساهمة</span><Pill tone={p.paymentStatus === "PAID" ? "green" : "amber"}>{p.paymentStatus === "PAID" ? "مدفوعة" : "غير مدفوعة"}</Pill></div>
                {p.paymentStatus !== "PAID" && comp.status !== "COMPLETED" && (
                  <button type="button" className="lg-btn primary full" onClick={() => actions.payContribution(comp.id)}><LIcon name="coin" size={15} /> دفع {fmtMoney(comp.fee)} (تجريبي)</button>
                )}
                {own && <div className="lg-participation-row"><span>ملخصك</span><Pill tone="green">{own.images.length} صفحات</Pill></div>}
                {comp.voteLocks.some((l) => l.voterId === student.id) && <div className="lg-participation-row"><span>التصويت</span><Pill tone="blue">مثبت</Pill></div>}
              </div>
            ) : (comp.status === "UPCOMING" || comp.status === "SUBMISSION_OPEN") ? (
              <button type="button" className="lg-btn primary full" onClick={() => actions.joinCompetition(comp.id)}>
                <LIcon name="plus" size={15} /> انضم إلى المسابقة
              </button>
            ) : (
              <p className="lg-muted sm">باب الانضمام مغلق في هذه المرحلة.</p>
            )}
          </section>

          <section className="lg-panel">
            <SectionHead title="قواعد سريعة" />
            <ul className="lg-rules">
              <li><LIcon name="check" size={14} /> 3 أصوات كحد أقصى، ويمكن استخدام أقل.</li>
              <li><LIcon name="check" size={14} /> كل صوت لملخص مختلف — لا تكرار.</li>
              <li><LIcon name="check" size={14} /> لا يمكن التصويت لملخصك.</li>
              <li><LIcon name="eyeoff" size={14} /> الهوية مخفية حتى اعتماد النتائج.</li>
              <li><LIcon name="coin" size={14} /> الجائزة = عدد المسددين × {fmtMoney(comp.fee)}.</li>
            </ul>
          </section>

          {isAdmin && (
            <section className="lg-panel">
              <SectionHead title="إدارة المسابقة" sub="صلاحيات مدير المجموعة" />
              <div className="lg-admin-actions">
                {comp.status === "PENDING_APPROVAL" && (
                  <button type="button" className="lg-btn primary full" onClick={() => go("admin", { tab: "results", competitionId: comp.id })}>
                    <LIcon name="shield" size={15} /> مراجعة واعتماد النتائج
                  </button>
                )}
                {comp.status !== "COMPLETED" && (
                  <button type="button" className="lg-btn ghost full" onClick={() => setAdvanceOpen(true)}>
                    <LIcon name="arrow" size={15} /> نقل للمرحلة التالية
                  </button>
                )}
                <button type="button" className="lg-btn ghost full" onClick={() => setEditOpen(true)} disabled={Boolean(comp.results)}>
                  <LIcon name="edit" size={15} /> تعديل بيانات المسابقة
                </button>
                {comp.status === "SUBMISSION_OPEN" && (
                  <button type="button" className="lg-btn ghost full" onClick={() => actions.sendDeadlineReminder(comp.id)}>
                    <LIcon name="bell" size={15} /> تذكير من لم يقدموا
                  </button>
                )}
                <button type="button" className="lg-btn ghost full" onClick={() => go("admin", { tab: "finance", competitionId: comp.id })}>
                  <LIcon name="coin" size={15} /> السجل المالي
                </button>
              </div>
            </section>
          )}

          {entry && (
            <section className="lg-panel">
              <SectionHead title="الملخص الفائز" />
              <button type="button" className="lg-latest-row" onClick={() => go("library", { entryId: entry.id })}>
                <span className="lg-doc"><LIcon name="book" size={15} /></span>
                <div><strong>{entry.title}</strong><small>{entry.attribution?.rankLabel} — {fmtDate(entry.publishedAt)}</small></div>
                <LIcon name="chevron-left" size={15} />
              </button>
            </section>
          )}
        </aside>
      </div>

      {editOpen && <CompetitionForm initial={comp} onClose={() => setEditOpen(false)} />}
      {advanceOpen && (
        <Modal title="نقل المسابقة للمرحلة التالية" subtitle={`${STATUS[comp.status].ar} → ${STATUS[Object.keys(STATUS)[Object.keys(STATUS).indexOf(comp.status) + 1]]?.ar || "—"}`} onClose={() => setAdvanceOpen(false)}
          footer={(
            <>
              <button type="button" className="lg-btn ghost" onClick={() => setAdvanceOpen(false)}>إلغاء</button>
              <button type="button" className="lg-btn primary" onClick={() => { const r = actions.advanceStatus(comp.id); if (r.ok) setAdvanceOpen(false); }}>تأكيد النقل</button>
            </>
          )}>
          <p className="lg-muted">سيتم تسجيل هذا التغيير في سجل التدقيق وإشعار الطلاب. لا يمكن نقل المسابقة إلى «معتمدة» إلا من خلال اعتماد النتائج.</p>
        </Modal>
      )}
    </div>
  );
}

export default function Competitions({ route, go, openComp }) {
  const { state, can } = useLeague();
  const [filter, setFilter] = useState("active");
  const [createOpen, setCreateOpen] = useState(false);

  if (route?.compId) return <CompetitionDetail compId={route.compId} go={go} onBack={() => openComp(null)} />;

  const active = state.competitions.filter((c) => ["SUBMISSION_OPEN", "VOTING_OPEN", "PENDING_APPROVAL"].includes(c.status));
  const upcoming = state.competitions.filter((c) => c.status === "UPCOMING");
  const completed = state.competitions.filter((c) => c.status === "COMPLETED");
  const list = filter === "active" ? active : filter === "upcoming" ? upcoming : filter === "completed" ? completed : state.competitions;

  return (
    <div className="lg-view">
      <SectionHead title="ساحة المسابقات الأسبوعية" sub="مسابقة مستقلة لكل مادة — تقديم، قراءة، تصويت، ثم اعتماد"
        action={can("competition.create") && (
          <button type="button" className="lg-btn primary" onClick={() => setCreateOpen(true)}><LIcon name="plus" size={16} /> مسابقة جديدة</button>
        )} />

      <div className="lg-arena-tabs">
        {[
          ["active", "النشطة الآن", active.length],
          ["upcoming", "القادمة", upcoming.length],
          ["completed", "المنتهية", completed.length],
          ["all", "الكل", state.competitions.length],
        ].map(([key, label, count]) => (
          <button key={key} type="button" className={filter === key ? "on" : ""} onClick={() => setFilter(key)}>
            {label} <b>{count}</b>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <Empty icon="trophy" title="لا توجد مسابقات هنا" text={can("competition.create") ? "أنشئ مسابقة جديدة لتبدأ المنافسة." : "تابع الإشعارات لمعرفة المسابقات القادمة."} />
      ) : (
        <div className="lg-comp-grid arena">
          {list.map((c) => <CompetitionCard key={c.id} comp={c} subject={state.subjects.find((s) => s.id === c.subjectId)} onOpen={openComp} />)}
        </div>
      )}

      {createOpen && <CompetitionForm onClose={() => setCreateOpen(false)} />}
    </div>
  );
}
