import { uid } from "../domain.js";
import { fail, findComp, findStudent, log, notify, notifyGroup, requirePerm } from "./common.js";

function parseSummary(text) {
  const lines = String(text || "").split(/\r?\n/);
  const pages = [];
  let blocks = [];
  let bullets = [];
  const flushBullets = () => {
    if (bullets.length) {
      blocks.push({ type: "ul", items: bullets });
      bullets = [];
    }
  };
  const pushBlock = (b) => {
    flushBullets();
    blocks.push(b);
    if (blocks.length >= 4) {
      pages.push({ blocks });
      blocks = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("## ")) pushBlock({ type: "h", text: line.slice(3) });
    else if (line.startsWith("# ")) pushBlock({ type: "h", text: line.slice(2) });
    else if (line.startsWith("- ")) bullets.push(line.slice(2));
    else if (line.startsWith("> ")) pushBlock({ type: "callout", title: "ملاحظة", text: line.slice(2) });
    else pushBlock({ type: "p", text: line });
  }
  flushBullets();
  if (blocks.length) pages.push({ blocks });
  if (!pages.length) pages.push({ blocks: [{ type: "p", text: "لم يُدخل محتوى رقمي بعد." }] });
  return pages;
}

export function winningPosition(draft, comp, studentId) {
  if (!comp.results) return null;
  return comp.results.ranking.find((r) => r.studentId === Number(studentId) && r.rank === 1) || null;
}

export function canPublishFor(draft, comp, studentId) {
  return Boolean(winningPosition(draft, comp, studentId)) && comp.status === "COMPLETED";
}

export function submitWinningSummary(draft, compId, payload, ctx) {
  const comp = findComp(draft, compId);
  if (comp.status !== "COMPLETED" || !comp.results) fail("نشر الملخص الفائز متاح فقط بعد اعتماد النتائج.");
  const authorId = Number(payload.studentId || ctx.session.studentId);
  if (!authorId) fail("يجب تحديد الطالب صاحب الملخص.");
  const pos = winningPosition(draft, comp, authorId);
  if (!pos) fail("نشر الملخص متاح للفائزين بالمركز الأول فقط (بما فيهم المركز الأول المشترك).");
  if (ctx.session.kind === "student" && Number(ctx.session.studentId) !== authorId) fail("لا يمكنك نشر ملخص لطالب آخر.");
  if (draft.library.some((e) => e.competitionId === comp.id && e.studentId === authorId)) fail("يوجد ملخص منشور أو قيد المراجعة لهذا الفائز في هذه المسابقة.");
  if (!payload.title?.trim()) fail("عنوان الملخص مطلوب.");
  const subject = draft.subjects.find((s) => s.id === comp.subjectId);
  const author = findStudent(draft, authorId);
  const entry = {
    id: uid("lib"),
    subjectId: comp.subjectId,
    competitionId: comp.id,
    studentId: authorId,
    title: payload.title.trim(),
    lecture: comp.title.split(":")[0] || comp.title,
    competitionName: comp.title,
    rank: pos.rank,
    joint: Boolean(pos.joint),
    publishedAt: null,
    submittedAt: new Date().toISOString(),
    status: "PENDING_REVIEW",
    pages: parseSummary(payload.text),
    finalImages: Array.isArray(payload.images) ? payload.images : [],
    attribution: {
      subjectName: subject?.name || "",
      authorName: author.name,
      competitionName: comp.title,
      rankLabel: pos.joint ? "المركز الأول (مشترك)" : "المركز الأول",
      locked: true,
    },
  };
  draft.library.unshift(entry);
  notify(draft, "group_admin", "ملخص فائز بانتظار المراجعة", `${author.name} أرسل نسخة رقمية لملخص «${entry.title}». قارنها بالنسخة الأصلية قبل النشر.`, { tab: "admin", entryId: entry.id });
  log(draft, ctx.session, "رفع ملخص فائز للمراجعة", entry.id, null, { competitionId: comp.id, authorId, rank: pos.rank }, "تحويل الملخص بخط اليد إلى صيغة رقمية");
  return { message: "تم إرسال الملخص الرقمي لمراجعة مدير المجموعة. لن يُنشر قبل الاعتماد." };
}

export function updateEntryContent(draft, entryId, payload, ctx) {
  const entry = draft.library.find((e) => e.id === entryId);
  if (!entry) fail("الملخص غير موجود.");
  if (entry.status === "PUBLISHED") fail("الملخص منشور ولا يمكن تعديل محتواه. استخدم إصداراً جديداً مع سبب موثق.");
  const isOwner = Number(ctx.session.studentId) === entry.studentId;
  const isEditor = ctx.session.isEditor;
  if (!isOwner && !isEditor && !requireAdmin(ctx)) fail("لا تملك صلاحية تعديل هذا الملخص.");
  if (!payload.title?.trim()) fail("العنوان مطلوب.");
  entry.title = payload.title.trim();
  entry.pages = parseSummary(payload.text);
  log(draft, ctx.session, "تعديل مسودة ملخص", entryId, null, { title: entry.title }, "تعديل قبل النشر");
  return { message: "تم حفظ مسودة الملخص." };
}

function requireAdmin(ctx) {
  return ctx.session.kind === "group_admin" || ctx.session.kind === "platform_admin";
}

export function suggestEdit(draft, entryId, text, ctx) {
  requirePerm(ctx.session, "summary.review");
  const entry = draft.library.find((e) => e.id === entryId);
  if (!entry) fail("الملخص غير موجود.");
  if (!text?.trim()) fail("نص الاقتراح مطلوب.");
  draft.editorSuggestions.push({
    id: uid("es"), entryId, editorId: Number(ctx.session.studentId) || null,
    text: text.trim(), at: new Date().toISOString(), status: "OPEN",
  });
  log(draft, ctx.session, "اقتراح تعديل على ملخص", entryId, null, text.trim());
  notify(draft, "group_admin", "اقتراح مراجعة أولية جديد", `أضاف ${ctx.session.name} اقتراحاً على «${entry.title}».`, { tab: "admin", entryId });
  return { message: "تم إرسال الاقتراح إلى مدير المجموعة للمراجعة." };
}

export function publishEntry(draft, entryId, ctx) {
  requirePerm(ctx.session, "summary.publish");
  const entry = draft.library.find((e) => e.id === entryId);
  if (!entry) fail("الملخص غير موجود.");
  if (entry.status === "PUBLISHED") fail("الملخص منشور بالفعل.");
  const author = findStudent(draft, entry.studentId);
  const subject = draft.subjects.find((s) => s.id === entry.subjectId);
  if (!author || !subject) fail("بيانات النشر غير مكتملة.");
  entry.status = "PUBLISHED";
  entry.publishedAt = new Date().toISOString();
  entry.attribution = {
    ...(entry.attribution || {}),
    subjectName: subject.name,
    authorName: author.name,
    competitionName: entry.competitionName || entry.competitionId,
    rankLabel: entry.joint ? "المركز الأول (مشترك)" : "المركز الأول",
    locked: true,
  };
  for (const s of draft.editorSuggestions.filter((x) => x.entryId === entryId && x.status === "OPEN")) s.status = "RESOLVED";
  notifyGroup(draft, "نُشر ملخص جديد في المكتبة", `${subject.name}: «${entry.title}» للطالب ${author.name}. متاح الآن في قارئ الكتاب.`, { tab: "library", entryId });
  log(draft, ctx.session, "نشر ملخص في المكتبة", entryId, "PENDING_REVIEW", "PUBLISHED", "اعتماد النسخة الرقمية ومطابقتها بالأصل");
  return { message: "تم نشر الملخص في مكتبة المادة. هوية المؤلف مثبتة ولا يمكن تعديلها." };
}
