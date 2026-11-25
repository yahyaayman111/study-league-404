/* 404 Study League — domain constants, seed data and pure rules. */

export const YEAR = { id: "2025-2026", label: "2025 / 2026", en: "Academic Year 2025/2026" };

export const STATUS = {
  UPCOMING: { ar: "قادمة", en: "Upcoming", tone: "slate", short: "قادمة" },
  SUBMISSION_OPEN: { ar: "مفتوحة لتقديم الملخصات", en: "Submission open", tone: "blue", short: "التقديم مفتوح" },
  VOTING_OPEN: { ar: "مرحلة القراءة والتصويت", en: "Voting open", tone: "amber", short: "التصويت مفتوح" },
  PENDING_APPROVAL: { ar: "بانتظار اعتماد النتائج", en: "Pending approval", tone: "purple", short: "قيد الاعتماد" },
  COMPLETED: { ar: "مكتملة ومعتمدة", en: "Completed", tone: "green", short: "معتمدة" },
};

export const STATUS_ORDER = ["UPCOMING", "SUBMISSION_OPEN", "VOTING_OPEN", "PENDING_APPROVAL", "COMPLETED"];

export const NEXT_STATUS = {
  UPCOMING: "SUBMISSION_OPEN",
  SUBMISSION_OPEN: "VOTING_OPEN",
  VOTING_OPEN: "PENDING_APPROVAL",
  PENDING_APPROVAL: "COMPLETED",
};

export const BADGES = {
  summary_contributor: {
    ar: "مساهم في التلخيص", en: "Summary Contributor", icon: "✍️",
    desc: "شارة تقدير يمنحها مدير المجموعة للطالب صاحب ملخص معتمد عالي الجودة. شارة عرض فقط ولا تمنح أي صلاحيات.",
    kind: "recognition",
  },
  summary_editor: {
    ar: "محرر الملخصات", en: "Summary Editor", icon: "📝",
    desc: "دور وظيفي يمنحه مدير المجموعة للمراجعة الأولية واقتراح التعديلات، دون صلاحية الاعتماد أو النشر.",
    kind: "role",
  },
  weekly_champion: {
    ar: "بطل الأسبوع", en: "Weekly Champion", icon: "🥇",
    desc: "تُمنح تلقائياً عند تحقيق المركز الأول في أي مسابقة أسبوعية.",
    kind: "system",
  },
  top_contributor: {
    ar: "أكثر المساهمين", en: "Top Contributor", icon: "⭐",
    desc: "تُمنح للطلاب في الشريحة الأعلى من الملخصات المعتمدة (قاعدة قابلة للضبط).",
    kind: "system",
  },
  consistent_contributor: {
    ar: "مساهم منتظم", en: "Consistent Contributor", icon: "🔥",
    desc: "تُمنح عند تقديم ملخصات صحيحة في 3 أسابيع متتالية (قابل للضبط).",
    kind: "system",
  },
  annual_champion: {
    ar: "بطل العام", en: "404 Annual Champion", icon: "👑",
    desc: "تُمنح لصاحب أعلى رصيد نقاط سنوي عند إغلاق العام الدراسي.",
    kind: "system",
  },
};

export const PERMISSIONS = {
  student: [
    "league.view", "library.view", "library.download", "competition.join", "submission.upload",
    "vote.cast", "profile.view", "hall.view",
  ],
  editor: [
    "league.view", "library.view", "library.download", "competition.join", "submission.upload",
    "vote.cast", "profile.view", "hall.view", "summary.review",
  ],
  group_admin: [
    "league.view", "library.view", "library.download", "profile.view", "hall.view",
    "competition.create", "competition.manage", "results.approve", "summary.publish",
    "summary.review", "finance.manage", "roles.manage", "audit.view", "year.close",
    "submission.upload", "library.download",
  ],
  platform_admin: [
    "league.view", "library.view", "library.download", "profile.view", "hall.view",
    "competition.create", "competition.manage", "results.approve", "summary.publish",
    "summary.review", "finance.manage", "roles.manage", "audit.view", "year.close",
    "analytics.all", "rules.manage",
  ],
};

export function can(session, permission) {
  if (!session) return false;
  const role = session.kind === "group_admin" ? "group_admin"
    : session.kind === "platform_admin" ? "platform_admin"
      : session.isEditor ? "editor" : "student";
  return (PERMISSIONS[role] || []).includes(permission);
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

let seq = 0;
export const uid = (p = "id") => `${p}_${Date.now().toString(36)}_${(++seq).toString(36)}`;

const DAY = 86400000;
const iso = (ms) => new Date(ms).toISOString();
const at = (days, hours = 0) => iso(Date.now() + days * DAY + hours * 3600000);

export function fmtDate(value, withTime = false) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
  if (!withTime) return date;
  return `${date} — ${d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`;
}

export const fmtMoney = (n) => `${Number(n || 0).toLocaleString("ar-EG")} ج.م`;

export function daysLeft(value) {
  const ms = new Date(value).getTime() - Date.now();
  if (Number.isNaN(ms)) return "—";
  if (ms <= 0) return "انتهى";
  const h = Math.ceil(ms / 3600000);
  if (h < 24) return `${h} ساعة`;
  return `${Math.ceil(h / 24)} يوم`;
}

const shuffleKey = (id) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
};

export function anonymousSubmissions(submissions) {
  return [...submissions]
    .sort((a, b) => shuffleKey(a.id) - shuffleKey(b.id))
    .map((s, i) => ({
      id: s.id,
      anonymousNo: i + 1,
      label: `ملخص مشارك #${i + 1}`,
      images: s.images,
      notes: s.notes,
      submittedAt: s.submittedAt,
      studentId: s.studentId,
    }));
}

/* ------------------------------------------------------------------ */
/* seed                                                                */
/* ------------------------------------------------------------------ */

function handNote(title, body, variant = 0) {
  const colors = ["#20344f", "#4a3a2a", "#2f3d2a"];
  const lines = body.split("\n");
  const rows = lines.map((line, i) =>
    `<text x="800" y="${250 + i * 62}" text-anchor="end" font-family="Segoe UI, Tahoma, sans-serif" font-size="30" fill="${colors[variant % 3]}" opacity="0.9">${escapeXml(line)}</text>`
  ).join("");
  const ruled = Array.from({ length: 14 }, (_, i) =>
    `<line x1="110" y1="${300 + i * 62}" x2="800" y2="${300 + i * 62}" stroke="#b9c7d8" stroke-width="1" opacity="0.45"/>`
  ).join("");
  const doodle = `<path d="M150 860 q40 -35 80 0 t80 0" fill="none" stroke="#315fbd" stroke-width="3" opacity="0.35"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
    <rect width="900" height="1200" fill="#fffdf7"/>
    <rect x="40" y="40" width="820" height="1120" fill="none" stroke="#e2dccd" stroke-width="2"/>
    <text x="800" y="130" text-anchor="end" font-family="Segoe UI, Tahoma, sans-serif" font-size="38" font-weight="700" fill="#182230">${escapeXml(title)}</text>
    <text x="800" y="180" text-anchor="end" font-family="Segoe UI, Tahoma, sans-serif" font-size="20" fill="#8490a1">ملخص بخط اليد — 404 Study League</text>
    ${ruled}${rows}${doodle}
    <text x="800" y="1080" text-anchor="end" font-family="Segoe UI, Tahoma, sans-serif" font-size="18" fill="#8490a1">صفحة ${variant + 1}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
}

function pagesFor(entry) {
  return entry.pages;
}

/* A tiny content builder used for the seeded library summaries. */
const T = (text) => ({ type: "p", text });
const H = (text) => ({ type: "h", text });
const UL = (items) => ({ type: "ul", items });
const BOX = (title, text) => ({ type: "callout", title, text });
const TABLE = (headers, rows) => ({ type: "table", headers, rows });

export function createSeed(platformStudents = [], platformSubjects = []) {
  const names = [
    ["يوسف أحمد", "STU1001"],
    ["مريم خالد", "STU1002"],
    ["عمر محمود", "STU1003"],
    ["سلمى حسن", "STU1004"],
    ["كريم مصطفى", "STU1005"],
    ["نور الدين", "STU1006"],
  ];
  const students = names.map(([name, code], i) => ({
    id: i + 1,
    name,
    code,
    groupId: "g1",
    editor: i === 3,
    badges: i === 0
      ? [
          { badgeId: "summary_contributor", at: at(-40) },
          { badgeId: "weekly_champion", at: at(-7) },
        ]
      : i === 1
        ? [{ badgeId: "weekly_champion", at: at(-21) }]
        : i === 3
          ? [{ badgeId: "summary_editor", at: at(-30) }, { badgeId: "summary_contributor", at: at(-25) }]
          : [],
  }));

  const subjects = [
    { id: 1, name: platformSubjects[0]?.name || "تربية الحيوان", icon: "🐄", color: "blue" },
    { id: 2, name: platformSubjects[1]?.name || "تغذية الدواجن", icon: "🐔", color: "green" },
    { id: 3, name: platformSubjects[2]?.name || "تغذية المجترات", icon: "🐟", color: "orange" },
  ];

  const p = (studentId, paid = true) => ({
    studentId,
    paymentStatus: paid ? "PAID" : "UNPAID",
    paidAt: paid ? at(-6) : null,
    verifiedBy: paid ? "group_admin" : null,
  });
  const allPaid = [1, 2, 3, 4, 5, 6].map((id) => p(id));

  const sub = (comp, studentId, i, title, body) => ({
    id: `${comp}_s${i}`,
    competitionId: comp,
    studentId,
    images: [handNote(title, body, i % 3), handNote(title, `${body}\nتكملة الملخص ومراجعة أهم النقاط.`, (i + 1) % 3)],
    notes: i === 2 ? "ملاحظة: راجعت المراجع في نهاية المحاضرة." : "",
    submittedAt: at(-5 + i * 0.1),
  });

  const competitions = [
    {
      id: "c1", subjectId: 1, groupId: "g1",
      title: "المحاضرة 4: الجهاز الهضمي في المجترات",
      instructions: "ملخص بخط اليد لا يزيد عن 3 صفحات، مع رسم توضيحي لأجزاء المعدة.",
      startDate: at(-14), submissionDeadline: at(-10), votingStart: at(-10), votingEnd: at(-7),
      fee: 10, status: "COMPLETED", createdAt: at(-15),
      participants: allPaid,
      submissions: [
        sub("c1", 1, 1, "الجهاز الهضمي", "المعدة ذات الأربعة أقسام: الكرش، الشبكية، الأوراق، المعدة الحقيقية."),
        sub("c1", 2, 2, "هضم الألياف", "الكائنات الدقيقة في الكرش تكسر السليلوز وتنتج أحماض دهنية طيارة."),
        sub("c1", 3, 3, "الكرش", "الكرش أكبر الأقسام ويمثل 80% من حجم المعدة، ودرجة حموضته 6.5."),
        sub("c1", 4, 4, "الامتصاص", "امتصاص الأحماض الدهنية يحدث من جدار الكرش مباشرة."),
      ],
      votes: [
        { id: "v1", voterId: 1, submissionId: "c1_s2" }, { id: "v1b", voterId: 1, submissionId: "c1_s3" },
        { id: "v2", voterId: 2, submissionId: "c1_s1" }, { id: "v2b", voterId: 2, submissionId: "c1_s3" },
        { id: "v3", voterId: 3, submissionId: "c1_s1" }, { id: "v3b", voterId: 3, submissionId: "c1_s2" },
        { id: "v4", voterId: 4, submissionId: "c1_s1" }, { id: "v4b", voterId: 4, submissionId: "c1_s2" },
        { id: "v5", voterId: 5, submissionId: "c1_s1" }, { id: "v6", voterId: 6, submissionId: "c1_s4" },
      ],
      voteLocks: [{ voterId: 1, lockedAt: at(-8) }, { voterId: 2, lockedAt: at(-8) }],
      results: {
        approvedAt: at(-7), approvedBy: "group_admin", jointFirst: false, nextPositionRule: "standard",
        tieNotes: "لا يوجد تعادل على المركز الأول: يوسف أحمد 4 أصوات، مريم خالد 3 أصوات.",
        ranking: [
          { studentId: 1, submissionId: "c1_s1", rank: 1, votes: 4, points: 3, joint: false, historical: 0 },
          { studentId: 2, submissionId: "c1_s2", rank: 2, votes: 3, points: 2, joint: false, historical: 0 },
          { studentId: 3, submissionId: "c1_s3", rank: 3, votes: 2, points: 1, joint: false, historical: 0 },
        ],
        prize: { total: 60, status: "DELIVERED", winnerIds: [1], deliveredAt: at(-6), settlements: [], notes: "تم تسليم الجائزة كاملة للفائز الأول." },
      },
    },
    {
      id: "c2", subjectId: 2, groupId: "g1",
      title: "المحاضرة 2: أعلاف الدواجن والطاقة",
      instructions: "لخّص مصادر الطاقة والبروتين مع جدول نسب الإضافة. الحد الأقصى 3 صفحات.",
      startDate: at(-5), submissionDeadline: at(-1), votingStart: at(-1), votingEnd: at(3),
      fee: 10, status: "VOTING_OPEN", createdAt: at(-6),
      participants: allPaid,
      submissions: [
        sub("c2", 1, 1, "مصادر الطاقة", "الذرة والصويا هما المصدران الأساسيان للطاقة والبروتين في علائق الدواجن."),
        sub("c2", 2, 2, "نسب البروتين", "بادي 22%، نامي 19%، بياض 16% من البروتين الخام حسب المرحلة."),
        sub("c2", 3, 3, "الأحماض الأمينية", "الميثيونين والليسين أول ما يحدد جودة العليقة، ويجب إضافتهما صناعياً."),
        sub("c2", 4, 4, "الطاقة والاستهلاك", "زيادة الطاقة تقلل استهلاك العلف وتحسن معدل التحويل الغذائي."),
        sub("c2", 5, 5, "الفيتامينات", "فيتامين D3 والكالسيوم ضروريان لسلامة العظام وجودة القشرة."),
      ],
      votes: [
        { id: "c2v2", voterId: 2, submissionId: "c2_s3" }, { id: "c2v2b", voterId: 2, submissionId: "c2_s5" },
        { id: "c2v3", voterId: 3, submissionId: "c2_s1" }, { id: "c2v3b", voterId: 3, submissionId: "c2_s4" },
        { id: "c2v4", voterId: 4, submissionId: "c2_s1" }, { id: "c2v4b", voterId: 4, submissionId: "c2_s5" },
        { id: "c2v5", voterId: 5, submissionId: "c2_s2" }, { id: "c2v6", voterId: 6, submissionId: "c2_s2" },
      ],
      voteLocks: [{ voterId: 2, lockedAt: at(-0.5) }, { voterId: 3, lockedAt: at(-0.4) }],
      results: null,
    },
    {
      id: "c3", subjectId: 3, groupId: "g1",
      title: "المحاضرة 1: هضم الألياف في المجترات",
      instructions: "ملخص من صفحتين يشرح دور الكائنات الدقيقة في هضم الألياف.",
      startDate: at(-2), submissionDeadline: at(2), votingStart: at(2), votingEnd: at(5),
      fee: 10, status: "SUBMISSION_OPEN", createdAt: at(-3),
      participants: [1, 2, 3, 4, 5].map((id) => p(id)),
      submissions: [
        sub("c3", 2, 1, "هضم الألياف", "الألياف تتحلل بواسطة بكتيريا السليلوز في الكرش إلى أحماض دهنية طيارة."),
        sub("c3", 3, 2, "الكائنات الدقيقة", "توفر البروتين الميكروبي والفيتامينات وتنظم درجة الحموضة."),
      ],
      votes: [], voteLocks: [], results: null,
    },
    {
      id: "c4", subjectId: 1, groupId: "g1",
      title: "المحاضرة 5: صحة الضرع والتهاب الضرع",
      instructions: "ملخص علمي لأسباب التهاب الضرع وطرق الوقاية، مع صور توضيحية إن أمكن.",
      startDate: at(3), submissionDeadline: at(9), votingStart: at(9), votingEnd: at(12),
      fee: 10, status: "UPCOMING", createdAt: at(-1),
      participants: [], submissions: [], votes: [], voteLocks: [], results: null,
    },
    {
      id: "c5", subjectId: 2, groupId: "g1",
      title: "المحاضرة 1: البروتين في علائق الدواجن",
      instructions: "لخّص مصادر البروتين الحيواني والنباتي ومعدلات الإضافة.",
      startDate: at(-12), submissionDeadline: at(-8), votingStart: at(-8), votingEnd: at(-1),
      fee: 10, status: "PENDING_APPROVAL", createdAt: at(-13),
      participants: allPaid,
      submissions: [
        sub("c5", 1, 1, "البروتين النباتي", "كسب فول الصويا 44% بروتين وهو الأكثر استخداماً في العلائق."),
        sub("c5", 2, 2, "البروتين الحيواني", "مسحوق السمك واللحم مصادر غنية بالأحماض الأمينية الأساسية."),
        sub("c5", 3, 3, "توازن العليقة", "يجب موازنة الطاقة والبروتين لتجنب زيادة التكلفة أو ضعف النمو."),
        sub("c5", 4, 4, "الليسين والميثيونين", "الأحماض الأمينية المحددة الأولى والثانية في علائق الدواجن."),
        sub("c5", 5, 5, "البروتين والبيض", "زيادة البروتين في مرحلة البياض ترفع إنتاج البيض حتى حد معين."),
      ],
      votes: [
        { id: "c5v1", voterId: 1, submissionId: "c5_s2" }, { id: "c5v1b", voterId: 1, submissionId: "c5_s4" },
        { id: "c5v3", voterId: 3, submissionId: "c5_s2" }, { id: "c5v3b", voterId: 3, submissionId: "c5_s4" }, { id: "c5v3c", voterId: 3, submissionId: "c5_s5" },
        { id: "c5v5", voterId: 5, submissionId: "c5_s2" }, { id: "c5v5b", voterId: 5, submissionId: "c5_s4" }, { id: "c5v5c", voterId: 5, submissionId: "c5_s1" },
        { id: "c5v6", voterId: 6, submissionId: "c5_s5" }, { id: "c5v6b", voterId: 6, submissionId: "c5_s3" },
      ],
      voteLocks: [1, 3, 5, 6].map((voterId) => ({ voterId, lockedAt: at(-2) })),
      results: null,
    },
    /* Archived competitions used by the historical tie-breaker and the Hall of Fame. */
    {
      id: "c6", subjectId: 1, groupId: "g1",
      title: "المحاضرة 2: أعلاف الحيوان الأساسية",
      instructions: "ملخص لأهم الأعلاف الخشنة والمركزة.",
      startDate: at(-40), submissionDeadline: at(-36), votingStart: at(-36), votingEnd: at(-33),
      fee: 10, status: "COMPLETED", createdAt: at(-41),
      participants: allPaid,
      submissions: [
        sub("c6", 2, 1, "الأعلاف الخشنة", "الأتبان والسيقان غنية بالألياف وفقيرة بالبروتين."),
        sub("c6", 4, 2, "الأعلاف المركزة", "الحبوب والكسب مصدر مركز للطاقة والبروتين."),
      ],
      votes: [
        { id: "c6v1", voterId: 1, submissionId: "c6_s1" }, { id: "c6v3", voterId: 3, submissionId: "c6_s1" },
        { id: "c6v5", voterId: 5, submissionId: "c6_s2" }, { id: "c6v6", voterId: 6, submissionId: "c6_s2" },
      ],
      voteLocks: [], results: {
        approvedAt: at(-32), approvedBy: "group_admin", jointFirst: false, nextPositionRule: "standard",
        tieNotes: "المركز الأول لمريم خالد، والثاني لسلمى حسن.",
        ranking: [
          { studentId: 2, submissionId: "c6_s1", rank: 1, votes: 2, points: 3, joint: false, historical: 0 },
          { studentId: 4, submissionId: "c6_s2", rank: 2, votes: 2, points: 2, joint: false, historical: 0 },
        ],
        prize: { total: 60, status: "DELIVERED", winnerIds: [2], deliveredAt: at(-31), settlements: [], notes: "" },
      },
    },
    {
      id: "c7", subjectId: 3, groupId: "g1",
      title: "المحاضرة 3: إضافات الأعلاف",
      instructions: "ملخص عن الإضافات المعدنية والفيتامينية.",
      startDate: at(-28), submissionDeadline: at(-24), votingStart: at(-24), votingEnd: at(-21),
      fee: 10, status: "COMPLETED", createdAt: at(-29),
      participants: allPaid,
      submissions: [
        sub("c7", 4, 1, "الإضافات المعدنية", "الكالسيوم والفوسفور بنسبة 2:1 لضمان سلامة العظام."),
        sub("c7", 2, 2, "الفيتامينات", "فيتامين A وD وE ضرورية للنمو والمناعة والإنجاب."),
      ],
      votes: [
        { id: "c7v1", voterId: 1, submissionId: "c7_s1" }, { id: "c7v2", voterId: 2, submissionId: "c7_s1" },
        { id: "c7v5", voterId: 5, submissionId: "c7_s2" }, { id: "c7v6", voterId: 6, submissionId: "c7_s2" },
      ],
      voteLocks: [], results: {
        approvedAt: at(-20), approvedBy: "group_admin", jointFirst: false, nextPositionRule: "standard",
        tieNotes: "المركز الأول لسلمى حسن، والثاني لمريم خالد.",
        ranking: [
          { studentId: 4, submissionId: "c7_s1", rank: 1, votes: 2, points: 3, joint: false, historical: 0 },
          { studentId: 2, submissionId: "c7_s2", rank: 2, votes: 2, points: 2, joint: false, historical: 0 },
        ],
        prize: { total: 60, status: "DELIVERED", winnerIds: [4], deliveredAt: at(-19), settlements: [], notes: "" },
      },
    },
    {
      id: "c8", subjectId: 3, groupId: "g1",
      title: "المحاضرة 4: جودة الأعلاف وتخزينها",
      instructions: "ملخص عن معايير الجودة والتخزين الآمن للأعلاف.",
      startDate: at(-22), submissionDeadline: at(-18), votingStart: at(-18), votingEnd: at(-15),
      fee: 10, status: "COMPLETED", createdAt: at(-23),
      participants: allPaid,
      submissions: [
        sub("c8", 2, 1, "جودة الأعلاف", "يجب خلو العلف من العفن والسموم الفطرية وأن تكون الرطوبة أقل من 12%."),
        sub("c8", 4, 2, "تخزين الأعلاف", "التخزين في مكان جاف وجيد التهوية مع رفع الأكياس عن الأرض."),
      ],
      votes: [
        { id: "c8v1", voterId: 1, submissionId: "c8_s2" },
        { id: "c8v3", voterId: 3, submissionId: "c8_s2" },
      ],
      voteLocks: [], results: {
        approvedAt: at(-14), approvedBy: "group_admin", jointFirst: false, nextPositionRule: "standard",
        tieNotes: "المركز الأول لسلمى حسن بفارق صوتين.",
        ranking: [
          { studentId: 4, submissionId: "c8_s2", rank: 1, votes: 2, points: 3, joint: false, historical: 0 },
        ],
        prize: { total: 60, status: "DELIVERED", winnerIds: [4], deliveredAt: at(-13), settlements: [], notes: "" },
      },
    },
  ];

  const library = [
    {
      id: "lib1", subjectId: 1, competitionId: "c1", studentId: 1,
      title: "الجهاز الهضمي في المجترات",
      lecture: "المحاضرة 4",
      competitionName: "مسابقة الأسبوع الرابع — الجهاز الهضمي",
      rank: 1, joint: false, publishedAt: at(-6), status: "PUBLISHED",
      pages: [
        {
          blocks: [
            H("مقدمة"),
            T("المجترات حيوانات تمتلك معدة متعددة الأقسام تسمح لها بالاستفادة من الأعلاف الخشنة الغنية بالألياف."),
            UL(["الكرش: أكبر الأقسام وأهم موقع للتخمر الميكروبي.", "الشبكية: تساعد في حجز الأجسام الغريبة.", "الأوراق: امتصاص الماء والأحماض الدهنية.", "المعدة الحقيقية: الهضم الإنزيمي."]),
            BOX("معلومة للمراجعة", "درجة حموضة الكرش المثالية تتراوح بين 6.2 و6.8، وأي انخفاض حاد يؤثر على الكائنات الدقيقة."),
          ],
        },
        {
          blocks: [
            H("هضم الألياف"),
            T("تعتمد المجترات على بكتيريا السليلوز التي تكسر الروابط بين وحدات الجلوكوز في السليلوز، وتنتج أحماضاً دهنية طيارة توفر معظم طاقة الحيوان."),
            TABLE(["الحمض", "النسبة التقريبية"], [["حمض الخليك", "60 – 70%"], ["حمض البروبيونيك", "15 – 20%"], ["حمض البيوتريك", "10 – 15%"]]),
            T("يجب توفير الألياف الطويلة للحفاظ على نشاط المضغ والاجترار وتوازن الحموضة."),
          ],
        },
        {
          blocks: [
            H("خلاصة"),
            UL(["الكرش هو محرك الهضم في المجترات.", "التوازن بين الألياف والمركزات ضروري.", "أي اضطراب في الحموضة يقلل الإنتاج."]),
            BOX("تذكّر", "الملخصات المنشورة هنا تخضع لمراجعة مدير المجموعة ومقارنتها بالنسخة الأصلية بخط اليد."),
          ],
        },
      ],
    },
    {
      id: "lib2", subjectId: 1, competitionId: "c6", studentId: 2,
      title: "أعلاف الحيوان: الأساسيات",
      lecture: "المحاضرة 2",
      competitionName: "مسابقة الأسبوع الثاني — الأعلاف",
      rank: 1, joint: false, publishedAt: at(-31), status: "PUBLISHED",
      pages: [
        {
          blocks: [
            H("تقسيم الأعلاف"),
            T("تنقسم الأعلاف إلى خشنة غنية بالألياف ومركزة غنية بالطاقة أو البروتين، ويجب أن تتكامل في العليقة اليومية."),
            UL(["الأتبان والقش: ألياف عالية وبروتين منخفض.", "الحبوب: طاقة عالية وسهلة الهضم.", "الكسب: بروتين نباتي مرتفع."]),
          ],
        },
        {
          blocks: [
            H("المعادن والفيتامينات"),
            TABLE(["العنصر", "الأهمية"], [["الكالسيوم", "سلامة العظام والإنتاج"], ["الفوسفور", "التمثيل الغذائي للطاقة"], ["فيتامين A", "المناعة والنمو"]]),
            T("نقص المعادن يؤدي إلى ضعف النمو ومشاكل في العظام والإنجاب."),
          ],
        },
      ],
    },
    {
      id: "lib3", subjectId: 3, competitionId: "c7", studentId: 4,
      title: "إضافات الأعلاف المعدنية",
      lecture: "المحاضرة 3",
      competitionName: "مسابقة الأسبوع الثالث — الإضافات",
      rank: 1, joint: false, publishedAt: at(-19), status: "PUBLISHED",
      pages: [
        {
          blocks: [
            H("أهم الإضافات"),
            T("تضاف المعادن والفيتامينات بكميات صغيرة لكن أثرها كبير على الإنتاج والصحة."),
            UL(["الكالسيوم والفوسفور بنسبة 2:1.", "فيتامين D لامتصاص الكالسيوم.", "الزنك والمنجنيز لسلامة الأظلاف والجلد."]),
            BOX("تنبيه", "زيادة الإضافة قد تكون سامة، لذلك يجب اتباع نسب المصنع والمراجع العلمية."),
          ],
        },
      ],
    },
  ];

  for (const entry of library) {
    entry.attribution = {
      subjectName: subjects.find((s) => s.id === entry.subjectId)?.name || "",
      authorName: students.find((s) => s.id === entry.studentId)?.name || "",
      competitionName: entry.competitionName,
      rankLabel: entry.joint ? "المركز الأول (مشترك)" : "المركز الأول",
      locked: true,
    };
  }

  const pointsLedger = [
    { id: "p1", studentId: 1, competitionId: "c1", subjectId: 1, yearId: YEAR.id, rank: 1, points: 3, createdAt: at(-7) },
    { id: "p2", studentId: 2, competitionId: "c1", subjectId: 1, yearId: YEAR.id, rank: 2, points: 2, createdAt: at(-7) },
    { id: "p3", studentId: 3, competitionId: "c1", subjectId: 1, yearId: YEAR.id, rank: 3, points: 1, createdAt: at(-7) },
    { id: "p4", studentId: 2, competitionId: "c6", subjectId: 1, yearId: YEAR.id, rank: 1, points: 3, createdAt: at(-32) },
    { id: "p5", studentId: 4, competitionId: "c6", subjectId: 1, yearId: YEAR.id, rank: 2, points: 2, createdAt: at(-32) },
    { id: "p6", studentId: 4, competitionId: "c7", subjectId: 3, yearId: YEAR.id, rank: 1, points: 3, createdAt: at(-20) },
    { id: "p7", studentId: 2, competitionId: "c7", subjectId: 3, yearId: YEAR.id, rank: 2, points: 2, createdAt: at(-20) },
    { id: "p8", studentId: 4, competitionId: "c8", subjectId: 3, yearId: YEAR.id, rank: 1, points: 3, createdAt: at(-14) },
  ];

  const notifications = [
    { id: "n1", userId: "student:1", title: "مسابقة جديدة في تغذية الدواجن", body: "تم فتح التصويت على ملخصات المحاضرة 2. شارك بصوتك الآن.", link: { tab: "competitions", competitionId: "c2" }, isRead: false, createdAt: at(-1) },
    { id: "n2", userId: "student:1", title: "اقترب موعد إغلاق التصويت", body: "متبقي 3 أيام لإغلاق التصويت في مسابقة أعلاف الدواجن.", link: { tab: "competitions", competitionId: "c2" }, isRead: false, createdAt: at(-0.2) },
    { id: "n3", userId: "student:1", title: "نُشر ملخص جديد في المكتبة", body: "أضيف ملخص «الجهاز الهضمي في المجترات» إلى مكتبة تربية الحيوان.", link: { tab: "library", entryId: "lib1" }, isRead: true, createdAt: at(-6) },
    { id: "n4", userId: "group_admin", title: "نتائج بانتظار الاعتماد", body: "انتهى تصويت مسابقة البروتين في علائق الدواجن، والنتائج جاهزة للمراجعة.", link: { tab: "admin", competitionId: "c5" }, isRead: false, createdAt: at(-0.5) },
  ];

  const audit = [
    { id: "a1", actor: "مدير المجموعة", actorRole: "group_admin", action: "اعتماد نتائج المسابقة", target: "c1", reason: "", at: at(-7), before: "PENDING_APPROVAL", after: "COMPLETED" },
    { id: "a2", actor: "مدير المجموعة", actorRole: "group_admin", action: "تسليم جائزة مالية", target: "c1", reason: "تسليم كامل الجائزة للفائز الأول", at: at(-6), before: "PENDING", after: "DELIVERED" },
    { id: "a3", actor: "مدير المجموعة", actorRole: "group_admin", action: "منح دور محرر الملخصات", target: "student:4", reason: "دقة عالية في المراجعة", at: at(-30), before: "student", after: "editor" },
  ];

  return {
    version: 1,
    seededAt: Date.now(),
    year: YEAR,
    currentYearId: YEAR.id,
    group: { id: "g1", name: "المجموعة الأولى", code: "BIO101" },
    students,
    subjects,
    competitions,
    library,
    pointsLedger,
    notifications,
    audit,
    annualChampions: [
      { yearId: "2024-2025", championId: 4, points: 42, archivedAt: at(-200), top: [4, 2, 1] },
    ],
    editorSuggestions: [
      { id: "es1", entryId: "lib1", editorId: 4, text: "يُفضّل توضيح الفرق بين الكرش والشبكية في السطر الثاني.", at: at(-5), status: "OPEN" },
    ],
    lastPrizeSettlement: null,
  };
}

/* ------------------------------------------------------------------ */
/* pure rules                                                          */
/* ------------------------------------------------------------------ */

export function paidParticipants(comp) {
  return comp.participants.filter((x) => x.paymentStatus === "PAID");
}

export function prizePool(comp) {
  return paidParticipants(comp).length * Number(comp.fee || 0);
}

export function tally(comp) {
  const map = new Map();
  for (const v of comp.votes || []) map.set(v.submissionId, (map.get(v.submissionId) || 0) + 1);
  return map;
}

export function historicalVotes(state, studentId, excludeSubjectId, excludeCompId) {
  let total = 0;
  const details = [];
  for (const c of state.competitions) {
    if (c.id === excludeCompId || c.subjectId === excludeSubjectId) continue;
    if (c.status !== "COMPLETED") continue;
    const votes = c.votes.filter((v) => {
      const s = c.submissions.find((x) => x.id === v.submissionId);
      return s && s.studentId === studentId;
    }).length;
    if (votes > 0) {
      total += votes;
      details.push({ competitionId: c.id, subjectId: c.subjectId, votes });
    }
  }
  return { total, details };
}

/**
 * Rank a competition. Ties for first are resolved by historical votes from
 * other subjects. A persistent tie produces a joint first place (both 3 pts).
 */
export function rankCompetition(state, comp) {
  const counts = tally(comp);
  const rows = comp.submissions.map((s) => ({
    studentId: s.studentId,
    submissionId: s.id,
    votes: counts.get(s.id) || 0,
  })).filter((r) => r.votes > 0 || comp.status === "COMPLETED");
  rows.sort((a, b) => b.votes - a.votes);

  if (rows.length === 0) {
    return { ranking: [], jointFirst: false, tieNotes: "لا توجد أصوات مسجلة.", firstTied: [] };
  }

  const topVotes = rows[0].votes;
  const firstTied = rows.filter((r) => r.votes === topVotes);
  let jointFirst = false;
  let tieNotes = "";
  const hist = new Map();

  if (firstTied.length > 1) {
    for (const r of firstTied) {
      const h = historicalVotes(state, r.studentId, comp.subjectId, comp.id);
      hist.set(r.studentId, h);
      r.historical = h.total;
    }
    const values = firstTied.map((r) => r.historical);
    const maxHist = Math.max(...values);
    if (new Set(values).size === 1) {
      jointFirst = true;
      const names = firstTied.map((r) => state.students.find((s) => s.id === r.studentId)?.name).join(" و");
      tieNotes = `تعادل مستمر بين ${names} بعد احتساب الأصوات التاريخية في المواد الأخرى (${maxHist} صوت لكل منهما) → مركز أول مشترك، ولا يتم اختيار فائز منفرد.`;
    } else {
      firstTied.sort((a, b) => b.historical - a.historical);
      tieNotes = `تم كسر التعادل بالأصوات التاريخية في المواد الأخرى: ${firstTied.map((r) => `${state.students.find((s) => s.id === r.studentId)?.name} (${r.historical})`).join("، ")}.`;
    }
  }

  const ordered = jointFirst
    ? [...firstTied, ...rows.filter((r) => r.votes !== topVotes)]
    : [...firstTied, ...rows.filter((r) => r.votes !== topVotes)];

  let rank = 1;
  const ranking = [];
  for (const row of ordered) {
    const isJointFirst = jointFirst && firstTied.includes(row);
    if (ranking.length && !isJointFirst) {
      rank = ranking.length + 1;
    }
    const points = isJointFirst ? 3 : rank === 1 ? 3 : rank === 2 ? 2 : rank === 3 ? 1 : 0;
    ranking.push({ ...row, rank: isJointFirst ? 1 : rank, points, joint: isJointFirst });
    if (!(jointFirst && firstTied.includes(row))) rank += 1;
  }

  return { ranking, jointFirst, tieNotes, firstTied, historical: Object.fromEntries([...hist].map(([k, v]) => [k, v])) };
}

export function computeStandings(state, yearId = state.currentYearId) {
  const rows = state.students.map((s) => {
    const entries = state.pointsLedger.filter((p) => p.studentId === s.id && p.yearId === yearId);
    const points = entries.reduce((sum, p) => sum + p.points, 0);
    const medals = { gold: 0, silver: 0, bronze: 0 };
    for (const p of entries) {
      if (p.rank === 1) medals.gold++;
      else if (p.rank === 2) medals.silver++;
      else if (p.rank === 3) medals.bronze++;
    }
    const subjects = [...new Set(entries.map((p) => state.subjects.find((x) => x.id === p.subjectId)?.name).filter(Boolean))];
    return { ...s, points, medals, subjects, entries };
  });
  rows.sort((a, b) => b.points - a.points || b.medals.gold - a.medals.gold || a.name.localeCompare(b.name, "ar"));
  let rank = 0, prev = null, seen = 0;
  for (const r of rows) {
    seen++;
    if (prev !== r.points) rank = seen;
    r.overallRank = rank;
    prev = r.points;
  }
  return rows;
}

export function visibleLibrary(state, subjectId) {
  return state.library
    .filter((e) => e.status === "PUBLISHED" && (!subjectId || e.subjectId === subjectId))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

export { pagesFor };
