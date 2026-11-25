import { useMemo, useState } from "react";
import { anonymousSubmissions, fmtDate } from "../domain.js";
import { LIcon, Modal, Pill, Empty } from "../ui.jsx";
import { useLeague } from "../store.jsx";
import { ImageBook } from "../BookReader.jsx";
import { downloadSubmissionPdf } from "../pdf.js";

export default function VotingGallery({ comp }) {
  const { state, session, student, actions } = useLeague();
  const [selected, setSelected] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState(null);

  const anonymous = useMemo(() => anonymousSubmissions(comp.submissions), [comp.submissions]);
  const locked = comp.voteLocks.some((l) => l.voterId === student?.id);
  const votes = comp.votes.filter((v) => v.voterId === student?.id);
  const participant = comp.participants.find((p) => p.studentId === student?.id);
  const isVoting = comp.status === "VOTING_OPEN";
  const isPending = comp.status === "PENDING_APPROVAL";
  const canVote = isVoting && !locked && participant?.paymentStatus === "PAID";

  const toggle = (id) => {
    if (!canVote) return;
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id]);
  };

  const submit = () => {
    const res = actions.castVotes(comp.id, selected);
    if (res.ok) {
      setConfirming(false);
      setSelected([]);
    }
  };

  if (!comp.submissions.length) {
    return <Empty icon="file" title="لا توجد ملخصات مقدمة" text="سيظهر هنا الملخصات بعد انتهاء فترة التقديم." />;
  }

  return (
    <div className="lg-voting">
      <div className={`lg-anon-banner ${isPending ? "pending" : ""}`}>
        <LIcon name={isPending ? "clock" : "eyeoff"} size={20} />
        <div>
          <strong>{isPending ? "انتهى التصويت — النتائج قيد المراجعة" : "تصويت مجهول الهوية"}</strong>
          <p>
            {isPending
              ? "لن تُعلن الهويات أو الأصوات حتى يعتمد مدير المجموعة النتائج النهائية."
              : "جميع الملخصات معروضة بأرقام محايدة. هوية المؤلفين مخفية، وترتيب الملخصات عشوائي لتقليل التحيّز."}
          </p>
        </div>
      </div>

      {locked && (
        <div className="lg-notice success">
          <LIcon name="check" size={18} />
          <div>
            <strong>تم تثبيت تصويتك</strong>
            <p>سجلت {votes.length} من 3 أصوات. لا يمكن تعديل الأصوات أو سحبها بعد التأكيد.</p>
          </div>
        </div>
      )}

      {!locked && isVoting && participant && participant.paymentStatus !== "PAID" && (
        <div className="lg-notice warn">
          <LIcon name="alert" size={18} />
          <div><strong>المساهمة غير مسددة</strong><p>يجب سداد المساهمة لتتمكن من التصويت.</p></div>
        </div>
      )}

      <div className="lg-anon-grid">
        {anonymous.map((sub) => {
          const isOwn = sub.studentId === student?.id;
          const active = selected.includes(sub.id);
          const vote = votes.some((v) => v.submissionId === sub.id);
          return (
            <div key={sub.id} className={`lg-anon-card ${active ? "selected" : ""} ${isOwn ? "own" : ""}`}>
              <div className="lg-anon-cover" onClick={() => setPreview(sub)} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") setPreview(sub); }}>
                <img src={sub.images[0]} alt="" />
                <span className="lg-anon-pages"><LIcon name="file" size={12} /> {sub.images.length} صفحات</span>
                <span className="lg-anon-preview"><LIcon name="eye" size={14} /> قراءة</span>
              </div>
              <div className="lg-anon-body">
                <div className="lg-anon-title">
                  <strong>{sub.label}</strong>
                  <Pill tone={vote ? "green" : "slate"}>{vote ? "صوتك مسجل" : "مجهول"}</Pill>
                </div>
                <small>قُدّم {fmtDate(sub.submittedAt)}</small>
                {sub.notes && <p className="lg-anon-note">“{sub.notes}”</p>}
                {isOwn ? (
                  <div className="lg-own-note"><LIcon name="lock" size={13} /> ملخصك الخاص، لا يمكن التصويت له</div>
                ) : (
                  <button type="button" className={`lg-vote-btn ${active ? "on" : ""}`} onClick={() => toggle(sub.id)} disabled={!canVote || locked || vote}>
                    <span className="lg-check">{active || vote ? <LIcon name="check" size={13} /> : null}</span>
                    {vote ? "تم تسجيل الصوت" : locked ? "التصويت مغلق" : active ? "محدد للتصويت" : "اختر هذا الملخص"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isVoting && !locked && (
        <div className="lg-vote-bar">
          <div>
            <strong>استخدمت {selected.length} من 3 أصوات</strong>
            <p>{selected.length === 3 ? "يمكنك الآن تأكيد اختياراتك. التأكيد نهائي." : `متبقي لك ${3 - selected.length} ${3 - selected.length === 1 ? "صوت" : "أصوات"} — يمكنك التصويت بأقل من ذلك.`}</p>
          </div>
          <div className="lg-vote-bar-actions">
            <span className="lg-vote-dots">{[0, 1, 2].map((i) => <i key={i} className={i < selected.length ? "on" : ""} />)}</span>
            <button type="button" className="lg-btn primary" disabled={!selected.length} onClick={() => setConfirming(true)}>
              تأكيد التصويت <LIcon name="arrow" size={15} />
            </button>
          </div>
        </div>
      )}

      {preview && (
        <ImageBook
          title={preview.label}
          subtitle="قراءة الملخص في قارئ الكتاب — هوية المؤلف مخفية"
          images={preview.images}
          onClose={() => setPreview(null)}
          onDownload={() => downloadSubmissionPdf(preview, preview.label)}
          downloadLabel="تحميل الملخص PDF"
        />
      )}

      {confirming && (
        <Modal
          title="تأكيد التصويت النهائي"
          subtitle="بعد التأكيد لا يمكن تعديل الأصوات أو سحبها"
          onClose={() => setConfirming(false)}
          footer={(
            <>
              <button type="button" className="lg-btn ghost" onClick={() => setConfirming(false)}>إلغاء</button>
              <button type="button" className="lg-btn primary" onClick={submit}>
                نعم، ثبّت {selected.length} {selected.length === 1 ? "صوت" : "أصوات"}
              </button>
            </>
          )}
        >
          <div className="lg-confirm-votes">
            {selected.map((id) => {
              const sub = anonymous.find((x) => x.id === id);
              return (
                <div key={id} className="lg-confirm-vote">
                  <span className="lg-anon-num">{sub?.anonymousNo}</span>
                  <div><strong>{sub?.label}</strong><small>{sub?.images.length} صفحات · مجهول الهوية</small></div>
                  <LIcon name="check" size={16} />
                </div>
              );
            })}
            <p className="lg-muted sm">لن يتم استخدام بقية الأصوات. التصويت بـ {selected.length} فقط مسموح ولا يُعد خطأ.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
