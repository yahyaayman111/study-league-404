import { fmtDate, fmtMoney, prizePool, STATUS } from "../domain.js";
import { LIcon, Pill } from "../ui.jsx";

export default function CompetitionCard({ comp, subject, onOpen, compact = false }) {
  const status = STATUS[comp.status] || STATUS.UPCOMING;
  const deadline = comp.status === "SUBMISSION_OPEN" ? comp.submissionDeadline : comp.status === "VOTING_OPEN" ? comp.votingEnd : null;
  return (
    <button type="button" className={`lg-comp-card ${compact ? "compact" : ""} ${status.tone}`} onClick={() => onOpen?.(comp.id)}>
      <div className="lg-comp-top">
        <span className={`lg-subject-icon ${subject?.color || "blue"}`} aria-hidden="true">{subject?.icon || "📘"}</span>
        <Pill tone={status.tone}>{status.short}</Pill>
      </div>
      <div className="lg-comp-subject">{subject?.name || "مادة"}</div>
      <h4>{comp.title}</h4>
      <div className="lg-comp-meta">
        <span><LIcon name="calendar" size={13} /> {deadline ? `حتى ${fmtDate(deadline)}` : fmtDate(comp.votingEnd)}</span>
        <span><LIcon name="users" size={13} /> {comp.participants.length} مشارك</span>
      </div>
      <div className="lg-comp-foot">
        <span className="lg-prize"><LIcon name="coin" size={14} /> {fmtMoney(prizePool(comp))}</span>
        <span className="lg-open">التفاصيل <LIcon name="chevron-left" size={14} /></span>
      </div>
    </button>
  );
}
