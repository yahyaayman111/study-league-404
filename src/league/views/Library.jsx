import { useEffect, useMemo, useState } from "react";
import { BADGES, fmtDate, visibleLibrary } from "../domain.js";
import { useLeague } from "../store.jsx";
import { LIcon, Pill, Empty, SectionHead } from "../ui.jsx";
import BookReader from "../BookReader.jsx";
import { bulkDownload, downloadEntryPdf } from "../pdf.js";

export default function Library({ route, go }) {
  const { state, setToast } = useLeague();
  const [subject, setSubject] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("new");
  const [openId, setOpenId] = useState(null);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (route?.entryId) setOpenId(route.entryId);
  }, [route?.entryId]);

  const entries = useMemo(() => {
    let list = visibleLibrary(state, subject === "all" ? null : Number(subject));
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((e) => {
        const author = state.students.find((s) => s.id === e.studentId)?.name || "";
        return `${e.title} ${e.lecture} ${author} ${e.attribution?.authorName || ""}`.toLowerCase().includes(q);
      });
    }
    list = [...list].sort((a, b) => sort === "new"
      ? new Date(b.publishedAt) - new Date(a.publishedAt)
      : new Date(a.publishedAt) - new Date(b.publishedAt));
    return list;
  }, [state, subject, query, sort]);

  const allSelected = entries.length > 0 && entries.every((e) => selected.includes(e.id));
  const toggle = (id) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const open = entries.find((e) => e.id === openId);

  const downloadOne = async (entry) => {
    try {
      setBusy(true);
      setToast({ type: "success", text: "جارٍ تجهيز ملف PDF..." });
      await downloadEntryPdf(entry);
      setToast({ type: "success", text: `تم تجهيز «${entry.title}» بصيغة PDF.` });
    } catch (e) {
      setToast({ type: "error", text: e.message || "تعذر إنشاء ملف PDF." });
    } finally {
      setBusy(false);
    }
  };

  const downloadBulk = async () => {
    const targets = selected.length ? entries.filter((e) => selected.includes(e.id)) : entries;
    if (!targets.length) return;
    try {
      setBusy(true);
      setToast({ type: "success", text: `جارٍ تجهيز ${targets.length} ملخصاً داخل ملف ZIP...` });
      const size = await bulkDownload(targets, subject === "all" ? "مكتبة-404" : state.subjects.find((s) => s.id === Number(subject))?.name);
      setToast({ type: "success", text: `تم تجهيز الأرشيف (${Math.max(1, Math.round(size / 1024))} كيلوبايت).` });
    } catch (e) {
      setToast({ type: "error", text: e.message || "تعذر تجهيز ملفات التحميل." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lg-view">
      <SectionHead title="مكتبة الملخصات المعتمدة" sub="ملخصات رقمية موثقة بهوية المؤلف — قارئ الكتاب هو الوضع الافتراضي"
        action={(
          <div className="lg-lib-actions">
            <button type="button" className="lg-btn ghost" onClick={downloadBulk} disabled={busy || !entries.length}>
              <LIcon name="download" size={15} /> {busy ? "جارٍ التجهيز..." : selected.length ? `تحميل المحدد (${selected.length})` : `تحميل الكل (${entries.length})`}
            </button>
          </div>
        )} />

      <div className="lg-subject-chips">
        <button type="button" className={subject === "all" ? "on" : ""} onClick={() => setSubject("all")}>كل المواد</button>
        {state.subjects.map((s) => (
          <button key={s.id} type="button" className={Number(subject) === s.id ? "on" : ""} onClick={() => setSubject(s.id)}>
            <span>{s.icon}</span> {s.name}
          </button>
        ))}
      </div>

      <div className="lg-filter-bar">
        <div className="lg-search">
          <LIcon name="search" size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث بعنوان المحاضرة أو اسم الطالب..." />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="مسح"><LIcon name="x" size={14} /></button>}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="lg-select">
          <option value="new">الأحدث نشراً</option>
          <option value="old">الأقدم نشراً</option>
        </select>
        <button type="button" className="lg-btn ghost sm" onClick={() => { setQuery(""); setSubject("all"); setSort("new"); setSelected([]); }}>
          <LIcon name="refresh" size={14} /> إعادة الضبط
        </button>
        <label className="lg-select-all">
          <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : entries.map((e) => e.id))} />
          تحديد الكل
        </label>
      </div>

      {entries.length === 0 ? (
        <Empty icon="book" title="لا توجد ملخصات مطابقة" text="جرّب تغيير المادة أو كلمة البحث، أو انتظر نشر أول ملخص فائز." />
      ) : (
        <div className="lg-lib-grid">
          {entries.map((entry) => {
            const author = state.students.find((s) => s.id === entry.studentId);
            const subj = state.subjects.find((s) => s.id === entry.subjectId);
            const badges = (author?.badges || []).map((b) => BADGES[b.badgeId]).filter(Boolean);
            return (
              <article key={entry.id} className={`lg-lib-card ${selected.includes(entry.id) ? "selected" : ""}`}>
                <div className="lg-lib-cover" onClick={() => setOpenId(entry.id)} role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") setOpenId(entry.id); }}>
                  <span className="lg-lib-subject">{subj?.icon} {subj?.name}</span>
                  <span className="lg-lib-rank"><LIcon name="medal" size={13} /> {entry.joint ? "المركز الأول (مشترك)" : entry.rank === 1 ? "المركز الأول" : `المركز ${entry.rank}`}</span>
                  <span className="lg-lib-open"><LIcon name="book" size={16} /> افتح في قارئ الكتاب</span>
                </div>
                <div className="lg-lib-body">
                  <div className="lg-lib-top">
                    <label className="lg-checkbox"><input type="checkbox" checked={selected.includes(entry.id)} onChange={() => toggle(entry.id)} /></label>
                    <div className="lg-lib-title"><h4>{entry.title}</h4><small>{entry.lecture} · {entry.competitionName}</small></div>
                  </div>
                  <div className="lg-lib-author">
                    <span className="lg-avatar sm">{author?.name?.slice(0, 1)}</span>
                    <div><strong>{author?.name}</strong><small>نُشر {fmtDate(entry.publishedAt)}</small></div>
                    {badges.slice(0, 2).map((b, i) => <span key={i} className="lg-mini-badge" title={`${b.en} — ${b.desc}`}>{b.icon}</span>)}
                  </div>
                  <div className="lg-lib-foot">
                    <button type="button" className="lg-btn primary sm" onClick={() => setOpenId(entry.id)}><LIcon name="book" size={14} /> قراءة</button>
                    <button type="button" className="lg-btn ghost sm" onClick={() => downloadOne(entry)} disabled={busy}><LIcon name="download" size={14} /> PDF</button>
                    <Pill tone="slate">{entry.pages.length} صفحات</Pill>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="lg-notice soft mt">
        <LIcon name="lock" size={18} />
        <div>
          <strong>الوصول مقيد بأعضاء المجموعة</strong>
          <p>المكتبة تعرض فقط الملخصات المنشورة والمعتمدة. بطاقة المؤلف مثبتة داخل كل ملخص ولا يمكن إزالتها أو تعديلها.</p>
        </div>
      </div>

      {open && (
        <BookReader
          entry={open}
          initialPage={0}
          onClose={() => { setOpenId(null); if (route?.entryId) go("library"); }}
          onDownload={downloadOne}
        />
      )}
    </div>
  );
}
