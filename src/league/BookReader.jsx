import { useEffect, useMemo, useRef, useState } from "react";
import { fmtDate } from "./domain.js";
import { LIcon, Modal } from "./ui.jsx";

function useWide() {
  const [wide, setWide] = useState(() => (typeof window === "undefined" ? true : window.innerWidth >= 900));
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return wide;
}

export function AttributionHeader({ entry }) {
  const a = entry.attribution || {};
  return (
    <div className="lg-attribution">
      <div className="lg-attribution-lock"><LIcon name="lock" size={14} /></div>
      <div className="lg-attribution-grid">
        <div><span>المادة</span><strong>{a.subjectName || "—"}</strong></div>
        <div><span>المحاضرة / الموضوع</span><strong>{entry.lecture || entry.title}</strong></div>
        <div><span>الطالب صاحب الملخص</span><strong>{a.authorName || "—"}</strong></div>
        <div><span>تاريخ النشر</span><strong>{fmtDate(entry.publishedAt || entry.submittedAt)}</strong></div>
        <div><span>المسابقة</span><strong>{entry.competitionName || "—"}</strong></div>
        <div><span>المركز</span><strong>{a.rankLabel || (entry.rank === 1 ? "المركز الأول" : `المركز ${entry.rank}`)}{entry.joint ? " (مشترك)" : ""}</strong></div>
      </div>
      <span className="lg-attribution-note">توثيق المؤلف مثبت ولا يمكن حذفه أو تعديله</span>
    </div>
  );
}

function Blocks({ blocks }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === "h") return <h4 key={i}>{b.text}</h4>;
        if (b.type === "p") return <p key={i}>{b.text}</p>;
        if (b.type === "ul") return <ul key={i}>{b.items.map((x, j) => <li key={j}>{x}</li>)}</ul>;
        if (b.type === "callout") return <div className="lg-callout" key={i}><strong>{b.title || "ملاحظة"}</strong><p>{b.text}</p></div>;
        if (b.type === "table") return (
          <div className="lg-table-wrap" key={i}>
            <table className="lg-table">
              <thead><tr>{b.headers.map((h, j) => <th key={j}>{h}</th>)}</tr></thead>
              <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        );
        if (b.type === "image") return <img key={i} src={b.src} alt={b.alt || ""} className="lg-reader-image" />;
        return null;
      })}
    </>
  );
}

function ReaderPage({ entry, index, total, className = "" }) {
  if (index == null) return <div className={`lg-paper blank ${className}`} />;
  const page = entry.pages[index] || { blocks: [] };
  return (
    <article className={`lg-paper ${className}`}>
      <div className="lg-paper-head">
        <span>404 Study League</span>
        <span>{entry.attribution?.subjectName}</span>
      </div>
      <div className="lg-paper-body"><Blocks blocks={page.blocks} /></div>
      <div className="lg-paper-foot">
        <span>{entry.title}</span>
        <span>{index + 1} / {total}</span>
      </div>
    </article>
  );
}

function StandardPage({ entry, index, total }) {
  return (
    <section className="lg-standard-page" id={`lg-std-${index}`}>
      <div className="lg-standard-num">صفحة {index + 1} من {total}</div>
      <div className="lg-paper-body"><Blocks blocks={entry.pages[index]?.blocks || []} /></div>
    </section>
  );
}

export default function BookReader({ entry, onClose, onDownload, initialPage = 0 }) {
  const wide = useWide();
  const total = entry.pages.length;
  const step = wide ? 2 : 1;
  const [mode, setMode] = useState("book");
  const [page, setPage] = useState(() => Math.min(initialPage, Math.max(0, total - 1)));
  const [turn, setTurn] = useState(0);
  const [busy, setBusy] = useState(false);
  const standardRef = useRef(null);

  const spread = useMemo(() => {
    if (!wide) return [page, null];
    const first = page % 2 === 0 ? page : page - 1;
    return [first, first + 1 < total ? first + 1 : null];
  }, [page, wide, total]);

  const go = (dir) => {
    setPage((p) => {
      const next = dir > 0 ? Math.min(total - 1, p + step) : Math.max(0, p - step);
      return next;
    });
    setTurn((t) => t + 1);
  };

  const jump = (index) => {
    const next = wide ? (index % 2 === 0 ? index : index - 1) : index;
    setPage(Math.max(0, Math.min(total - 1, next)));
    setTurn((t) => t + 1);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") { go(1); e.preventDefault(); }
      if (e.key === "ArrowRight") { go(-1); e.preventDefault(); }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const switchMode = (next) => {
    if (next === mode) return;
    if (next === "standard") {
      setMode(next);
      setTimeout(() => {
        const el = document.getElementById(`lg-std-${page}`);
        el?.scrollIntoView({ block: "start" });
      }, 60);
    } else {
      setMode(next);
      setTimeout(() => standardRef.current?.scrollTo?.({ top: 0 }), 0);
    }
  };

  const download = async () => {
    setBusy(true);
    try {
      await onDownload?.(entry);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="قارئ الكتاب"
      subtitle={mode === "book" ? "وضع قارئ الكتاب — الوضع الافتراضي" : "العرض العادي"}
      onClose={onClose}
      size="xl"
      tone="reader"
      footer={(
        <div className="lg-reader-footer">
          <div className="lg-mode-switch" role="group" aria-label="طريقة العرض">
            <button type="button" className={mode === "book" ? "active" : ""} onClick={() => switchMode("book")}>
              <LIcon name="book" size={15} /> قارئ الكتاب
            </button>
            <button type="button" className={mode === "standard" ? "active" : ""} onClick={() => switchMode("standard")}>
              <LIcon name="list" size={15} /> العرض العادي
            </button>
          </div>
          <span className="lg-reader-hint">استخدم ← → للتنقل بين الصفحات</span>
          <button type="button" className="lg-btn ghost" onClick={download} disabled={busy}>
            <LIcon name="download" size={15} /> {busy ? "جارٍ التجهيز..." : "تحميل PDF"}
          </button>
          <button type="button" className="lg-icon-btn" onClick={onClose} aria-label="إغلاق"><LIcon name="x" size={18} /></button>
        </div>
      )}
    >
      <AttributionHeader entry={entry} />

      {mode === "book" ? (
        <div className="lg-reader-wrap">
          <div className="lg-reader-spread" dir="rtl" key={`${spread[0]}-${turn}`}>
            <ReaderPage entry={entry} index={spread[0]} total={total} className="right" />
            {wide ? <ReaderPage entry={entry} index={spread[1]} total={total} className="left" /> : null}
            <div className="lg-spine" aria-hidden="true" />
          </div>
          <button type="button" className="lg-page-nav prev" onClick={() => go(-1)} disabled={page <= 0} aria-label="السابق">
            <LIcon name="chevron-right" size={22} />
          </button>
          <button type="button" className="lg-page-nav next" onClick={() => go(1)} disabled={page >= total - 1} aria-label="التالي">
            <LIcon name="chevron-left" size={22} />
          </button>
          <div className="lg-page-dots">
            {entry.pages.map((_, i) => (
              <button key={i} type="button" className={page === i || (spread[0] === i) ? "on" : ""} onClick={() => jump(i)} aria-label={`صفحة ${i + 1}`} />
            ))}
          </div>
          <div className="lg-page-count">
            صفحة {page + 1}{wide && spread[1] != null ? `–${spread[1] + 1}` : ""} من {total}
          </div>
        </div>
      ) : (
        <div className="lg-reader-standard" ref={standardRef}>
          {entry.pages.map((_, i) => <StandardPage key={i} entry={entry} index={i} total={total} />)}
          <div className="lg-standard-nav">
            <button type="button" className="lg-btn ghost" onClick={() => switchMode("book")}>
              <LIcon name="book" size={15} /> العودة إلى قارئ الكتاب
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function ImageBook({ title, subtitle, images, attribution, onClose, onDownload, downloadLabel = "تحميل PDF" }) {
  const wide = useWide();
  const step = wide ? 2 : 1;
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);

  const go = (dir) => setPage((p) => Math.max(0, Math.min(images.length - 1, p + dir * step)));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") { go(1); e.preventDefault(); }
      if (e.key === "ArrowRight") { go(-1); e.preventDefault(); }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const download = async () => {
    if (!onDownload) return;
    setBusy(true);
    try { await onDownload(); } finally { setBusy(false); }
  };

  return (
    <Modal title={title} subtitle={subtitle} onClose={onClose} size="xl" tone="reader"
      footer={(
        <div className="lg-reader-footer">
          {onDownload && (
            <button type="button" className="lg-btn ghost" onClick={download} disabled={busy}>
              <LIcon name="download" size={15} /> {busy ? "جارٍ التجهيز..." : downloadLabel}
            </button>
          )}
          <span className="lg-reader-hint">استخدم ← → للتنقل</span>
          <button type="button" className="lg-icon-btn" onClick={onClose} aria-label="إغلاق"><LIcon name="x" size={18} /></button>
        </div>
      )}
    >
      {attribution}
      <div className="lg-reader-wrap">
        <div className="lg-image-spread" dir="rtl">
          {[images[page], wide ? images[page + 1] : null].map((src, i) =>
            src ? <img key={`${page}-${i}`} className="lg-scan" src={src} alt={`صفحة ${page + i + 1}`} /> : <div key={i} className="lg-scan blank" />
          )}
          <div className="lg-spine" aria-hidden="true" />
        </div>
        <button type="button" className="lg-page-nav prev" onClick={() => go(-1)} disabled={page <= 0} aria-label="السابق"><LIcon name="chevron-right" size={22} /></button>
        <button type="button" className="lg-page-nav next" onClick={() => go(1)} disabled={page >= images.length - 1} aria-label="التالي"><LIcon name="chevron-left" size={22} /></button>
        <div className="lg-page-count">صفحة {page + 1}{wide && images[page + 1] ? `–${page + 2}` : ""} من {images.length}</div>
      </div>
    </Modal>
  );
}
