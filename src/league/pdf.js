/* Client-side PDF + ZIP generation. No external libraries.
   - Handwritten scans: rasterise each page image and embed as JPEG in a PDF.
   - Digital summaries: render Arabic RTL pages to canvas, then embed as JPEG.
   - Bulk downloads: store-only ZIP archive. */

import { fmtDate } from "./domain.js";

const A4 = { w: 1240, h: 1754 };

export function sanitizeFilename(name) {
  return String(name || "summary")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "summary";
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("تعذر قراءة الصورة المرفقة."));
    img.src = src;
  });
}

async function imageToJpeg(src, maxW = 1600, quality = 0.88) {
  const img = await loadImage(src);
  const scale = Math.min(1, maxW / img.naturalWidth);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return { data: canvas.toDataURL("image/jpeg", quality).split(",")[1], width: w, height: h };
}

function jpegBytes(base64) {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function buildPdf(jpegs) {
  const enc = new TextEncoder();
  const chunks = [];
  let offset = 0;
  const push = (part) => {
    const bytes = typeof part === "string" ? enc.encode(part) : part;
    chunks.push(bytes);
    offset += bytes.length;
  };

  const pageCount = jpegs.length;
  const pageId = (i) => 3 + i * 3;
  const contentId = (i) => 4 + i * 3;
  const imageId = (i) => 5 + i * 3;
  const maxId = 2 + pageCount * 3;
  const offsets = new Array(maxId + 1).fill(0);

  push("%PDF-1.4\n%");
  push(new Uint8Array([0xe2, 0xe3, 0xcf, 0xd3]));
  push("\n");

  const obj = (id, dict, stream) => {
    offsets[id] = offset;
    push(`${id} 0 obj\n${dict}\n`);
    if (stream) {
      push("stream\n");
      push(stream);
      push("\nendstream\n");
    }
    push("endobj\n");
  };

  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  const kids = jpegs.map((_, i) => `${pageId(i)} 0 R`).join(" ");
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`);

  jpegs.forEach((jpg, i) => {
    const { data, width, height } = jpg;
    const scale = Math.min(595 / width, 842 / height);
    const dw = width * scale;
    const dh = height * scale;
    const x = (595 - dw) / 2;
    const y = (842 - dh) / 2;
    obj(pageId(i), `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${imageId(i)} 0 R >> >> /Contents ${contentId(i)} 0 R >>`);
    const content = `q\n${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/Im0 Do\nQ\n`;
    obj(contentId(i), `<< /Length ${enc.encode(content).length} >>`, content);
    obj(imageId(i), `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes(data).length} >>`, jpegBytes(data));
  });

  const xrefStart = offset;
  let xref = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id++) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  push(`trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);

  return new Blob(chunks, { type: "application/pdf" });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ---------------- digital summary rendering ---------------- */

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function paintPage(entry, index, total) {
  const canvas = document.createElement("canvas");
  canvas.width = A4.w;
  canvas.height = A4.h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fffdf7";
  ctx.fillRect(0, 0, A4.w, A4.h);
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = "#182230";

  const M = 90;
  let y = 110;

  if (index === 0) {
    ctx.fillStyle = "#315fbd";
    ctx.font = "600 22px 'Segoe UI', Tahoma, sans-serif";
    ctx.fillText("404 STUDY LEAGUE", A4.w - M, 70);
    ctx.fillStyle = "#8490a1";
    ctx.font = "18px 'Segoe UI', Tahoma, sans-serif";
    ctx.fillText("مكتبة الملخصات المعتمدة", A4.w - M, 98);
    ctx.fillStyle = "#182230";
    ctx.font = "700 34px 'Segoe UI', Tahoma, sans-serif";
    const titleLines = wrapText(ctx, entry.title, A4.w - M * 2);
    for (const line of titleLines) {
      ctx.fillText(line, A4.w - M, y);
      y += 46;
    }
    y += 8;
    ctx.fillStyle = "#f0f4fd";
    ctx.fillRect(M, y, A4.w - M * 2, 150);
    ctx.fillStyle = "#315fbd";
    ctx.font = "600 18px 'Segoe UI', Tahoma, sans-serif";
    ctx.fillText("بطاقة التوثيق (غير قابلة للتعديل)", A4.w - M - 20, y + 34);
    ctx.fillStyle = "#3b4a5e";
    ctx.font = "19px 'Segoe UI', Tahoma, sans-serif";
    const meta = [
      `المادة: ${entry.attribution?.subjectName || ""}`,
      `المحاضرة: ${entry.lecture || ""} — ${entry.competitionName || ""}`,
      `المؤلف: ${entry.attribution?.authorName || ""} — ${entry.attribution?.rankLabel || ""}`,
      `تاريخ النشر: ${fmtDate(entry.publishedAt || entry.submittedAt)}`,
    ];
    meta.forEach((line, i) => ctx.fillText(line, A4.w - M - 20, y + 62 + i * 24));
    y += 180;
    ctx.strokeStyle = "#e2dccd";
    ctx.beginPath();
    ctx.moveTo(M, y);
    ctx.lineTo(A4.w - M, y);
    ctx.stroke();
    y += 50;
  } else {
    ctx.fillStyle = "#8490a1";
    ctx.font = "18px 'Segoe UI', Tahoma, sans-serif";
    ctx.fillText(entry.title, A4.w - M, 70);
    y = 120;
  }

  const drawLines = (text, font, color, lineHeight, indent = 0) => {
    ctx.fillStyle = color;
    ctx.font = font;
    const lines = wrapText(ctx, text, A4.w - M * 2 - indent);
    for (const line of lines) {
      ctx.fillText(line, A4.w - M - indent, y);
      y += lineHeight;
    }
  };

  const blocks = entry.pages[index]?.blocks || [];
  for (const block of blocks) {
    if (block.type === "h") {
      y += 18;
      drawLines(block.text, "700 28px 'Segoe UI', Tahoma, sans-serif", "#182230", 38);
      y += 6;
    } else if (block.type === "p") {
      drawLines(block.text, "22px 'Segoe UI', Tahoma, sans-serif", "#3b4a5e", 36);
      y += 10;
    } else if (block.type === "ul") {
      for (const item of block.items) {
        ctx.fillStyle = "#315fbd";
        ctx.beginPath();
        ctx.arc(A4.w - M - 6, y - 7, 4, 0, Math.PI * 2);
        ctx.fill();
        drawLines(item, "22px 'Segoe UI', Tahoma, sans-serif", "#3b4a5e", 34, 26);
        y += 4;
      }
      y += 8;
    } else if (block.type === "callout") {
      ctx.fillStyle = "#f0f4fd";
      ctx.fillRect(M, y - 22, A4.w - M * 2, 84);
      ctx.fillStyle = "#315fbd";
      ctx.font = "600 20px 'Segoe UI', Tahoma, sans-serif";
      ctx.fillText(block.title || "ملاحظة", A4.w - M - 18, y + 4);
      drawLines(block.text, "20px 'Segoe UI', Tahoma, sans-serif", "#3b4a5e", 28, 18);
      y += 70;
    } else if (block.type === "table") {
      const cols = block.headers.length;
      const colW = (A4.w - M * 2) / cols;
      ctx.fillStyle = "#edf2fc";
      ctx.fillRect(M, y - 24, A4.w - M * 2, 44);
      ctx.fillStyle = "#315fbd";
      ctx.font = "600 19px 'Segoe UI', Tahoma, sans-serif";
      block.headers.forEach((h, i) => ctx.fillText(h, A4.w - M - i * colW - 12, y + 4));
      y += 44;
      ctx.font = "19px 'Segoe UI', Tahoma, sans-serif";
      for (const row of block.rows) {
        ctx.fillStyle = "#3b4a5e";
        row.forEach((cell, i) => ctx.fillText(cell, A4.w - M - i * colW - 12, y + 4));
        ctx.strokeStyle = "#e8edf3";
        ctx.beginPath();
        ctx.moveTo(M, y + 14);
        ctx.lineTo(A4.w - M, y + 14);
        ctx.stroke();
        y += 38;
      }
      y += 10;
    }
    if (y > A4.h - 180) break;
  }

  ctx.fillStyle = "#8490a1";
  ctx.font = "16px 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText(`404 Study League · صفحة ${index + 1} من ${total}`, A4.w - M, A4.h - 54);
  ctx.textAlign = "left";
  ctx.fillText("الملخص موثق بهوية المؤلف — لا يمكن إزالة التوثيق", M, A4.h - 54);

  return canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
}

export async function entryToJpegs(entry) {
  const total = Math.max(1, entry.pages.length);
  const jpegs = [];
  for (let i = 0; i < total; i++) {
    const data = paintPage(entry, i, total);
    const img = await loadImage(`data:image/jpeg;base64,${data}`);
    jpegs.push({ data, width: img.naturalWidth, height: img.naturalHeight });
  }
  return jpegs;
}

export async function entryPdfBlob(entry) {
  const jpegs = await entryToJpegs(entry);
  return buildPdf(jpegs);
}

export async function downloadEntryPdf(entry) {
  const blob = await entryPdfBlob(entry);
  downloadBlob(blob, `${sanitizeFilename(entry.title)}.pdf`);
  return blob.size;
}

export async function submissionPdfBlob(submission, title) {
  const jpegs = [];
  for (const src of submission.images) {
    jpegs.push(await imageToJpeg(src));
  }
  return buildPdf(jpegs);
}

export async function downloadSubmissionPdf(submission, title) {
  const blob = await submissionPdfBlob(submission, title);
  downloadBlob(blob, `${sanitizeFilename(title)}-بخط-اليد.pdf`);
  return blob.size;
}

/* ---------------- ZIP (store, UTF-8 names) ---------------- */

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const time = ((date.getHours() & 31) << 11) | ((date.getMinutes() & 63) << 5) | (Math.floor(date.getSeconds() / 2) & 31);
  const day = (((date.getFullYear() - 1980) & 127) << 9) | (((date.getMonth() + 1) & 15) << 5) | (date.getDate() & 31);
  return { time, day };
}

export async function zipFiles(files) {
  const enc = new TextEncoder();
  const entries = [];
  for (const file of files) {
    const bytes = new Uint8Array(await file.blob.arrayBuffer());
    const nameBytes = enc.encode(file.name);
    entries.push({ name: nameBytes, bytes, crc: crc32(bytes) });
  }
  const { time, day } = dosDateTime();
  const chunks = [];
  let offset = 0;
  const push = (bytes) => {
    chunks.push(bytes);
    offset += bytes.length;
  };
  const u16 = (v) => new Uint8Array([v & 0xff, (v >>> 8) & 0xff]);
  const u32 = (v) => new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]);

  const central = [];
  for (const e of entries) {
    const headerOffset = offset;
    push(new Uint8Array([0x50, 0x4b, 0x03, 0x04]));
    push(u16(20)); push(u16(0x0800)); push(u16(0)); push(u16(time)); push(u16(day));
    push(u32(e.crc)); push(u32(e.bytes.length)); push(u32(e.bytes.length));
    push(u16(e.name.length)); push(u16(0));
    push(e.name); push(e.bytes);
    central.push({ ...e, offset: headerOffset });
  }
  const centralStart = offset;
  for (const e of central) {
    push(new Uint8Array([0x50, 0x4b, 0x01, 0x02]));
    push(u16(20)); push(u16(20)); push(u16(0x0800)); push(u16(0)); push(u16(time)); push(u16(day));
    push(u32(e.crc)); push(u32(e.bytes.length)); push(u32(e.bytes.length));
    push(u16(e.name.length)); push(u16(0)); push(u16(0)); push(u16(0)); push(u16(0));
    push(u32(0)); push(u32(e.offset)); push(e.name);
  }
  const centralSize = offset - centralStart;
  push(new Uint8Array([0x50, 0x4b, 0x05, 0x06]));
  push(u16(0)); push(u16(0)); push(u16(entries.length)); push(u16(entries.length));
  push(u32(centralSize)); push(u32(centralStart)); push(u16(0));
  return new Blob(chunks, { type: "application/zip" });
}

export async function bulkDownload(entries, label = "مكتبة-404") {
  const files = [];
  for (const entry of entries) {
    const blob = await entryPdfBlob(entry);
    files.push({ name: `${sanitizeFilename(entry.title)}.pdf`, blob });
  }
  if (files.length === 1) {
    downloadBlob(files[0].blob, files[0].name);
    return files[0].blob.size;
  }
  const zip = await zipFiles(files);
  downloadBlob(zip, `${sanitizeFilename(label)}.zip`);
  return zip.size;
}
