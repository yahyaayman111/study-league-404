import { useEffect, useMemo, useState } from "react";
import "./index.css";
import LeagueApp from "./league/LeagueApp.jsx";

/* ------------------------------------------------------------------ */
/* Demo data                                                          */
/* ------------------------------------------------------------------ */

const initialAdmins = [
  { id: 1, name: "أحمد محمد", email: "admin@demo.com", group: "g1", code: "BIO101" },
  { id: 2, name: "سارة علي", email: "sara@demo.com", group: "g2", code: "ANI202" },
];

const initialStudents = [
  { id: 1, name: "يوسف أحمد", code: "STU1001", group: "g1", status: "active" },
  { id: 2, name: "مريم خالد", code: "STU1002", group: "g1", status: "active" },
  { id: 3, name: "عمر محمود", code: "STU1003", group: "g2", status: "active" },
  { id: 4, name: "سلمى حسن", code: "STU1004", group: "g1", status: "active" },
  { id: 5, name: "كريم مصطفى", code: "STU1005", group: "g1", status: "active" },
  { id: 6, name: "نور الدين", code: "STU1006", group: "g1", status: "active" },
];

const initialSubjects = [
  { id: 1, name: "تربية الحيوان", lessons: 8, color: "blue" },
  { id: 2, name: "تغذية الدواجن", lessons: 6, color: "green" },
  { id: 3, name: "تغذية المجترات", lessons: 5, color: "orange" },
];

const copy = {
  ar: {
    brand: "404", tagline: "منصة التعلّم والتميّز الدراسي", login: "تسجيل الدخول",
    league: "دوري 404 الدراسي", leagueSub: "404 Study League",
    welcome: "أهلاً بعودتك", loginHint: "سجّل الدخول إلى مساحتك التعليمية",
    name: "الاسم", code: "كود الدخول", role: "نوع الحساب", admin: "مدير مجموعة",
    super: "مدير المنصة", learner: "طالب", enter: "دخول إلى المنصة",
    demo: "حسابات تجريبية", adminDash: "لوحة الإدارة", superDash: "لوحة مدير المنصة",
    learnerDash: "مساحتي التعليمية", overview: "نظرة عامة", students: "الطلاب",
    subjects: "المواد الدراسية", tests: "الاختبارات", chat: "المحادثات",
    admins: "المديرون", settings: "الإعدادات", logout: "تسجيل الخروج",
    hello: "مرحباً", overviewText: "إليك ملخص نشاط مساحتك التعليمية اليوم.",
    totalStudents: "إجمالي الطلاب", totalSubjects: "المواد الدراسية", testsDone: "اختبارات مكتملة",
    average: "متوسط الدرجات", recent: "آخر النشاطات", quick: "اختصارات سريعة",
    addStudent: "إضافة طالب", addSubject: "إضافة مادة", createTest: "إنشاء اختبار",
    search: "ابحث هنا...", studentName: "اسم الطالب", studentCode: "كود الطالب",
    group: "المجموعة", status: "الحالة", actions: "إجراءات", active: "نشط",
    add: "إضافة", cancel: "إلغاء", delete: "حذف", edit: "تعديل",
    subjectName: "اسم المادة", lessons: "عدد الدروس", noItems: "لا توجد عناصر بعد.",
    adminsTitle: "إدارة المديرين", addAdmin: "إضافة مدير", adminName: "اسم المدير",
    email: "البريد الإلكتروني", groupCode: "كود المجموعة", save: "حفظ",
    materials: "المحتوى التعليمي", continue: "متابعة التعلّم", progress: "تقدمك الدراسي",
    completed: "مكتمل", startTest: "ابدأ الاختبار", question: "ما المقصود بالتعلّم النشط؟",
    answer1: "استقبال المعلومات دون مشاركة", answer2: "مشاركة الطالب في عملية التعلّم",
    answer3: "حفظ المعلومات فقط", submit: "تأكيد الإجابة", correct: "إجابة صحيحة!",
    wrong: "حاول مرة أخرى، الإجابة الصحيحة هي مشاركة الطالب في عملية التعلّم.",
    testTitle: "اختبار تجريبي", testDesc: "سؤال تدريبي سريع لتجربة واجهة الاختبارات.",
    chatTitle: "المحادثات", chatHint: "ستظهر محادثات مجموعتك هنا في النسخة المتصلة.",
    settingsTitle: "الإعدادات", language: "لغة الواجهة", theme: "المظهر",
    light: "فاتح", dark: "داكن", empty: "لا توجد بيانات للعرض حالياً.",
    loginError: "من فضلك أدخل الاسم وكود الدخول واختر نوع الحساب.",
    studentAdded: "تمت إضافة الطالب بنجاح", subjectAdded: "تمت إضافة المادة بنجاح",
    adminAdded: "تمت إضافة المدير بنجاح", footer: "نسخة تجريبية للعرض والتجربة",
    allGroups: "كل المجموعات", myCourses: "موادي الدراسية", announcements: "إعلانات",
    announcementText: "مرحباً بك في منصتك التعليمية. نتمنى لك تجربة تعلّم ممتعة!",
    back: "رجوع", close: "إغلاق", demoNote: "هذه بيانات تجريبية وليست حسابات حقيقية.",
    group1: "المجموعة الأولى", group2: "المجموعة الثانية", groupNew: "مجموعة جديدة",
    lessonsShort: "دروس",
    deleteConfirm: "هل تريد الحذف نهائياً؟", deleteHint: "لا يمكن استرجاع العنصر بعد حذفه.",
    yesDelete: "نعم، احذف", deleted: "تم الحذف بنجاح",
    resetData: "استعادة البيانات التجريبية", resetHint: "إرجاع الطلاب والمواد والمديرين إلى الحالة الأصلية.",
    resetDone: "تمت استعادة البيانات التجريبية", quickFill: "تعبئة سريعة",
    correctAnswer: "الإجابة الصحيحة", wrongAnswer: "إجابة غير صحيحة",
    viewResults: "النتيجة", questionOf: "السؤال ١ من ١",
  },
  en: {
    brand: "404", tagline: "Study League learning platform", login: "Log in",
    league: "404 Study League", leagueSub: "404 Study League",
    welcome: "Welcome back", loginHint: "Sign in to your learning space",
    name: "Name", code: "Access code", role: "Account type", admin: "Group Admin",
    super: "Platform Owner", learner: "Learner", enter: "Enter platform",
    demo: "Demo accounts", adminDash: "Admin Dashboard", superDash: "Platform Owner",
    learnerDash: "My Learning Space", overview: "Overview", students: "Students",
    subjects: "Subjects", tests: "Tests", chat: "Messages", admins: "Admins",
    settings: "Settings", logout: "Log out", hello: "Hello",
    overviewText: "Here is a summary of your learning space today.",
    totalStudents: "Total students", totalSubjects: "Subjects", testsDone: "Tests completed",
    average: "Average grade", recent: "Recent activity", quick: "Quick actions",
    addStudent: "Add student", addSubject: "Add subject", createTest: "Create test",
    search: "Search...", studentName: "Student name", studentCode: "Student code",
    group: "Group", status: "Status", actions: "Actions", active: "Active",
    add: "Add", cancel: "Cancel", delete: "Delete", edit: "Edit",
    subjectName: "Subject name", lessons: "Number of lessons", noItems: "No items yet.",
    adminsTitle: "Manage admins", addAdmin: "Add admin", adminName: "Admin name",
    email: "Email", groupCode: "Group code", save: "Save", materials: "Learning content",
    continue: "Continue learning", progress: "Your progress", completed: "Completed",
    startTest: "Start test", question: "What is active learning?",
    answer1: "Receiving information without participation",
    answer2: "Student participation in the learning process",
    answer3: "Memorizing information only", submit: "Submit answer",
    correct: "Correct answer!", wrong: "Try again. The correct answer is student participation.",
    testTitle: "Demo test", testDesc: "A quick practice question to preview the test interface.",
    chatTitle: "Messages", chatHint: "Your group conversations will appear here when connected.",
    settingsTitle: "Settings", language: "Interface language", theme: "Appearance",
    light: "Light", dark: "Dark", empty: "Nothing to display yet.",
    loginError: "Please enter your name and access code, then choose an account type.",
    studentAdded: "Student added successfully", subjectAdded: "Subject added successfully",
    adminAdded: "Admin added successfully", footer: "Interactive prototype",
    allGroups: "All groups", myCourses: "My courses", announcements: "Announcements",
    announcementText: "Welcome to your learning platform. Enjoy your learning journey!",
    back: "Back", close: "Close", demoNote: "These are demo credentials, not real accounts.",
    group1: "Group One", group2: "Group Two", groupNew: "New group",
    lessonsShort: "lessons",
    deleteConfirm: "Delete this item?", deleteHint: "This action can't be undone.",
    yesDelete: "Yes, delete", deleted: "Deleted successfully",
    resetData: "Reset demo data", resetHint: "Restore the original students, subjects and admins.",
    resetDone: "Demo data restored", quickFill: "Quick fill",
    correctAnswer: "Correct answer", wrongAnswer: "Incorrect answer",
    viewResults: "Result", questionOf: "Question 1 of 1",
  },
};

/* ------------------------------------------------------------------ */
/* Icons (inline SVG so they render identically on every device)      */
/* ------------------------------------------------------------------ */

const ICONS = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.6" />
      <rect x="14" y="3" width="7" height="7" rx="1.6" />
      <rect x="3" y="14" width="7" height="7" rx="1.6" />
      <rect x="14" y="14" width="7" height="7" rx="1.6" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  book: (
    <>
      <path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" />
      <path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" />
    </>
  ),
  quiz: (
    <>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="m9 14 2 2 4-4" />
    </>
  ),
  chat: (
    <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
  ),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  "arrow-left": <path d="M19 12H5M12 19l-7-7 7-7" />,
  "arrow-right": <path d="M5 12h14M12 5l7 7-7 7" />,
  check: <path d="M20 6 9 17l-5-5" />,
  cap: (
    <>
      <path d="M22 10 12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="m7 15 4-5 4 3 5-7" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0z" />
      <path d="M17 5h3v2a4 4 0 0 1-4 4M7 5H4v2a4 4 0 0 0 4 4" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  sparkle: <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />,
  trash: (
    <>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
  play: <path d="m8 5 11 7-11 7z" />,
};

function Icon({ name, size }) {
  return (
    <svg
      className="icon"
      width={size || 20}
      height={size || 20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name] || ICONS.grid}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                      */
/* ------------------------------------------------------------------ */

function readStore(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be unavailable (private mode) – ignore */
  }
}

const GROUP_KEYS = { g1: "group1", g2: "group2", g3: "groupNew" };

function groupLabel(t, key) {
  return t[GROUP_KEYS[key] || key] || key;
}

function nextCode(list, prefix, start) {
  const max = list.reduce((acc, item) => {
    const digits = parseInt(String(item.code || "").replace(/\D/g, ""), 10);
    return Number.isFinite(digits) ? Math.max(acc, digits) : acc;
  }, start);
  return `${prefix}${max + 1}`;
}

/* ------------------------------------------------------------------ */
/* App                                                                */
/* ------------------------------------------------------------------ */

export default function App() {
  const [lang, setLang] = useState(() => {
    const saved = readStore("madrasti.lang", "ar");
    return saved === "en" ? "en" : "ar";
  });
  const [dark, setDark] = useState(() => readStore("madrasti.theme", "light") === "dark");
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("admin");
  const [loginName, setLoginName] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [page, setPage] = useState("overview");
  const [students, setStudents] = useState(() => readStore("madrasti.students", initialStudents));
  const [subjects, setSubjects] = useState(() => readStore("madrasti.subjects", initialSubjects));
  const [admins, setAdmins] = useState(() => readStore("madrasti.admins", initialAdmins));
  const [modal, setModal] = useState("");
  const [form, setForm] = useState({});
  const [search, setSearch] = useState("");
  const [answer, setAnswer] = useState("");
  const [testResult, setTestResult] = useState("");
  const [toast, setToast] = useState("");
  const [confirm, setConfirm] = useState(null);

  const t = copy[lang];
  const rtl = lang === "ar";
  const isOwner = user?.role === "super";
  const isLearner = user?.role === "learner";
  const pageTitle = page === "league"
    ? t.league
    : isOwner ? t.superDash : isLearner ? t.learnerDash : t.adminDash;

  const leagueStudent = user
    ? students.find((s) => s.code === user.code) || students.find((s) => s.code === "STU1001")
    : null;
  const leagueSession = user
    ? user.role === "learner"
      ? { kind: "student", studentId: leagueStudent?.id, name: user.name, code: user.code }
      : user.role === "super"
        ? { kind: "platform_admin", name: user.name }
        : { kind: "group_admin", name: user.name }
    : null;

  const visibleStudents = useMemo(
    () =>
      students.filter((s) =>
        `${s.name} ${s.code} ${groupLabel(t, s.group)}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [students, search, t]
  );

  /* Document direction + title */
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.title = `${t.brand} | ${t.tagline}`;
  }, [lang, rtl, t]);

  /* Persist preferences and demo data */
  useEffect(() => writeStore("madrasti.lang", lang), [lang]);
  useEffect(() => writeStore("madrasti.theme", dark ? "dark" : "light"), [dark]);
  useEffect(() => writeStore("madrasti.students", students), [students]);
  useEffect(() => writeStore("madrasti.subjects", subjects), [subjects]);
  useEffect(() => writeStore("madrasti.admins", admins), [admins]);

  /* Toast auto-dismiss */
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(id);
  }, [toast]);

  /* Escape closes dialogs, and lock page scroll while one is open */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setModal("");
        setConfirm(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const open = Boolean(modal || confirm);
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modal, confirm]);

  function login(e) {
    e.preventDefault();
    if (!loginName.trim() || !loginCode.trim()) {
      setLoginError(t.loginError);
      return;
    }
    const matchedStudent = role === "learner"
      ? students.find((s) => String(s.code).toLowerCase() === loginCode.trim().toLowerCase())
      : null;
    if (role === "learner" && !matchedStudent) {
      setLoginError(rtl
        ? "كود الطالب غير صحيح. استخدم أحد الأكواد التجريبية: STU1001 … STU1006."
        : "Unknown student code. Use one of the demo codes: STU1001 … STU1006.");
      return;
    }
    setLoginError("");
    setUser({
      name: matchedStudent ? matchedStudent.name : loginName.trim(),
      role,
      code: loginCode.trim(),
    });
    setPage("overview");
  }

  function logout() {
    setUser(null);
    setLoginName("");
    setLoginCode("");
    setPage("overview");
    setSearch("");
    setModal("");
    setConfirm(null);
    setToast("");
  }

  function openModal(type) {
    setForm({});
    setModal(type);
  }

  function addStudent(e) {
    e.preventDefault();
    setStudents([
      ...students,
      {
        id: Date.now(),
        name: form.name?.trim() || "",
        code: form.code?.trim() || nextCode(students, "STU", 1000),
        group: form.group || "g1",
        status: "active",
      },
    ]);
    setModal("");
    setSearch("");
    setToast(t.studentAdded);
  }

  function addSubject(e) {
    e.preventDefault();
    setSubjects([
      ...subjects,
      {
        id: Date.now(),
        name: form.name?.trim() || "",
        lessons: Math.max(1, Math.min(99, Number(form.lessons) || 1)),
        color: ["purple", "blue", "green", "orange"][subjects.length % 4],
      },
    ]);
    setModal("");
    setToast(t.subjectAdded);
  }

  function addAdmin(e) {
    e.preventDefault();
    setAdmins([
      ...admins,
      {
        id: Date.now(),
        name: form.name?.trim() || "",
        email: form.email?.trim() || "",
        group: form.group?.trim() || t.groupNew,
        code: form.code?.trim() || nextCode(admins, "GRP", 100),
      },
    ]);
    setModal("");
    setToast(t.adminAdded);
  }

  function removeStudent(id) {
    setStudents(students.filter((s) => s.id !== id));
    setToast(t.deleted);
  }

  function removeSubject(id) {
    setSubjects(subjects.filter((s) => s.id !== id));
    setToast(t.deleted);
  }

  function removeAdmin(id) {
    setAdmins(admins.filter((a) => a.id !== id));
    setToast(t.deleted);
  }

  function askDelete(kind, id) {
    setConfirm({ kind, id });
  }

  function doDelete() {
    if (!confirm) return;
    if (confirm.kind === "student") removeStudent(confirm.id);
    if (confirm.kind === "subject") removeSubject(confirm.id);
    if (confirm.kind === "admin") removeAdmin(confirm.id);
    setConfirm(null);
  }

  function resetDemo() {
    setStudents(initialStudents);
    setSubjects(initialSubjects);
    setAdmins(initialAdmins);
    setSearch("");
    setToast(t.resetDone);
  }

  function toggleTheme() {
    setDark((v) => !v);
  }

  const languageToggle = (
    <button
      type="button"
      className="language-button"
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      aria-label={t.language}
      title={t.language}
    >
      {lang === "ar" ? "EN" : "عربي"}
    </button>
  );

  const themeToggle = (
    <button
      type="button"
      className="icon-button"
      onClick={toggleTheme}
      aria-label={t.theme}
      title={t.theme}
    >
      <Icon name={dark ? "sun" : "moon"} size={18} />
    </button>
  );

  if (!user) {
    return (
      <div className={`app login-app ${dark ? "dark" : ""}`} dir={rtl ? "rtl" : "ltr"}>
        <header className="topbar login-topbar">
          <Brand t={t} />
          <div className="top-actions">
            {languageToggle}
            {themeToggle}
          </div>
        </header>

        <main className="login-layout">
          <section className="login-intro">
            <div className="eyebrow">
              <span className="eyebrow-dot" /> {t.tagline}
            </div>
            <h1>
              {rtl ? (
                <>
                  التعلّم يبدأ
                  <br />
                  <span>من هنا.</span>
                </>
              ) : (
                <>
                  Learning starts
                  <br />
                  <span>right here.</span>
                </>
              )}
            </h1>
            <p>
              {rtl
                ? "مكان واحد يجمع محتواك الدراسي، اختباراتك، ومتابعة تقدمك."
                : "One place for your study materials, exams, and learning progress."}
            </p>
            <div className="intro-points">
              <span><Icon name="book" size={17} /> {t.subjects}</span>
              <span><Icon name="quiz" size={17} /> {t.tests}</span>
              <span><Icon name="chart" size={17} /> {t.progress}</span>
            </div>
            <div className="decor-orbit orbit-one" />
            <div className="decor-orbit orbit-two" />
          </section>

          <section className="login-card">
            <div className="card-mark"><Icon name="cap" size={24} /></div>
            <h2>{t.welcome}</h2>
            <p className="muted">{t.loginHint}</p>

            <form onSubmit={login} className="form-stack">
              <label>
                {t.role}
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="admin">{t.admin}</option>
                  <option value="learner">{t.learner}</option>
                  <option value="super">{t.super}</option>
                </select>
              </label>

              <label>
                {t.name}
                <input
                  value={loginName}
                  onChange={(e) => {
                    setLoginName(e.target.value);
                    setLoginError("");
                  }}
                  placeholder={rtl ? "اكتب اسمك" : "Enter your name"}
                  autoComplete="name"
                />
              </label>

              <label>
                {t.code}
                <input
                  value={loginCode}
                  onChange={(e) => {
                    setLoginCode(e.target.value);
                    setLoginError("");
                  }}
                  placeholder={rtl ? "اكتب أي كود تجريبي" : "Enter any demo code"}
                  autoComplete="off"
                />
              </label>

              {loginError && (
                <div className="error-message" role="alert">{loginError}</div>
              )}

              <button className="primary-button full-button" type="submit">
                {t.enter}
                <Icon name={rtl ? "arrow-left" : "arrow-right"} size={18} />
              </button>
            </form>

            <div className="demo-box">
              <div className="demo-head">
                <strong>{t.demo}</strong>
                <span className="demo-tag">{t.quickFill}</span>
              </div>
              <div className="demo-chips">
                {[
                  ["admin", t.admin],
                  ["learner", t.learner],
                  ["super", t.super],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className="demo-chip"
                    onClick={() => {
                      setRole(key);
                      setLoginName(key === "learner" ? "يوسف أحمد" : key === "admin" ? "أحمد محمد" : "إدارة المنصة");
                      setLoginCode(key === "learner" ? "STU1001" : key === "admin" ? "ADMIN-404" : "OWNER-404");
                      setLoginError("");
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p>
                {rtl
                  ? "أكواد الدخول: مدير المجموعة ADMIN-404 · الطالب STU1001 · مدير المنصة OWNER-404"
                  : "Access codes: admin ADMIN-404 · student STU1001 · owner OWNER-404"}
              </p>
              <small>{t.demoNote}</small>
            </div>
          </section>
        </main>

        <footer className="login-footer">
          <span>© 2026 {t.brand}</span>
          <span>{t.footer}</span>
        </footer>
      </div>
    );
  }

  const nav = isOwner
    ? [
        ["overview", "grid", t.overview],
        ["league", "trophy", t.league],
        ["admins", "shield", t.admins],
        ["students", "users", t.students],
        ["settings", "settings", t.settings],
      ]
    : isLearner
      ? [
          ["overview", "grid", t.overview],
          ["league", "trophy", t.league],
          ["subjects", "book", t.myCourses],
          ["tests", "quiz", t.tests],
          ["chat", "chat", t.chat],
          ["settings", "settings", t.settings],
        ]
      : [
          ["overview", "grid", t.overview],
          ["league", "trophy", t.league],
          ["students", "users", t.students],
          ["subjects", "book", t.subjects],
          ["tests", "quiz", t.tests],
          ["chat", "chat", t.chat],
          ["settings", "settings", t.settings],
        ];

  return (
    <div className={`app dashboard-app ${dark ? "dark" : ""}`} dir={rtl ? "rtl" : "ltr"}>
      <aside className="sidebar">
        <Brand t={t} />
        <div className="workspace-label">
          {isOwner ? t.super : isLearner ? t.learner : t.admin}
        </div>

        <nav className="side-nav" aria-label={t.overview}>
          {nav.map(([key, icon, label]) => (
            <button
              key={key}
              type="button"
              className={`nav-item ${page === key ? "active" : ""}`}
              aria-current={page === key ? "page" : undefined}
              onClick={() => {
                setPage(key);
                setSearch("");
                setModal("");
              }}
            >
              <Icon name={icon} size={19} />
              <span>{label}</span>
              {page === key && <i />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><Icon name="sparkle" size={16} /></div>
            <strong>{rtl ? "خلّي تعلّمك أسهل" : "Make learning easier"}</strong>
            <p>
              {rtl
                ? "كل أدواتك الدراسية في مكان واحد."
                : "All your study tools in one place."}
            </p>
          </div>
          <button type="button" className="nav-item logout-item" onClick={logout}>
            <Icon name="logout" size={19} />
            <span>{t.logout}</span>
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="dashboard-header">
          <div className="header-title">
            <div className="breadcrumb">{t.brand} <span>/</span> {pageTitle}</div>
            <h1>{pageTitle}</h1>
          </div>

          <div className="header-actions">
            {languageToggle}
            {themeToggle}
            <button
              type="button"
              className="icon-button mobile-logout"
              onClick={logout}
              aria-label={t.logout}
              title={t.logout}
            >
              <Icon name="logout" size={18} />
            </button>
            <div className="user-chip">
              <div className="avatar">{user.name.slice(0, 1)}</div>
              <div>
                <strong>{user.name}</strong>
                <small>{isOwner ? t.super : isLearner ? t.learner : t.admin}</small>
              </div>
            </div>
          </div>
        </header>

        <div className="page-content" key={page}>
          {page === "league" && (
            <LeagueApp session={leagueSession} platform={{ students, subjects }} />
          )}
          {page === "overview" && (
            <>
              <div className="welcome-banner">
                <div>
                  <div className="banner-kicker">
                    {t.hello}، {user.name} <span aria-hidden="true">👋</span>
                  </div>
                  <h2>{t.overviewText}</h2>
                  <p>{t.announcementText}</p>
                </div>
                <div className="banner-art"><Icon name="sparkle" size={42} /></div>
              </div>

              {isLearner ? (
                <>
                  <SectionHeading title={t.progress} />
                  <div className="progress-panel">
                    <div className="progress-ring">
                      <span>68%</span>
                    </div>
                    <div>
                      <strong>{rtl ? "أنت على الطريق الصحيح!" : "You're doing great!"}</strong>
                      <p className="muted">
                        {rtl
                          ? "واصل التقدم وأكمل دروسك."
                          : "Keep going and complete your lessons."}
                      </p>
                    </div>
                  </div>
                  <SectionHeading title={t.myCourses} />
                  <div className="subject-grid">
                    {subjects.map((s) => (
                      <SubjectCard
                        key={s.id}
                        subject={s}
                        t={t}
                        onClick={() => setPage("subjects")}
                      />
                    ))}
                  </div>
                  {subjects.length === 0 && <p className="empty-state">{t.noItems}</p>}
                </>
              ) : (
                <>
                  <div className="stats-grid">
                    <Stat icon="users" label={t.totalStudents} value={students.length} color="blue" />
                    <Stat icon="book" label={t.totalSubjects} value={subjects.length} color="green" />
                    <Stat icon="quiz" label={t.testsDone} value="24" color="orange" />
                    <Stat icon="chart" label={t.average} value="82%" color="purple" />
                  </div>

                  <div className="content-grid">
                    <section className="panel">
                      <SectionHeading title={t.recent} />
                      <div className="activity-list">
                        <Activity
                          icon="users"
                          title={rtl ? "تم تحديث قائمة الطلاب" : "Student list updated"}
                          time={rtl ? "منذ قليل" : "Just now"}
                        />
                        <Activity
                          icon="book"
                          title={rtl ? "تمت مراجعة المحتوى الدراسي" : "Learning content reviewed"}
                          time={rtl ? "منذ ساعة" : "1 hour ago"}
                        />
                        <Activity
                          icon="quiz"
                          title={rtl ? "تم إنشاء اختبار جديد" : "A new test was created"}
                          time={rtl ? "اليوم" : "Today"}
                        />
                      </div>
                    </section>

                    <section className="panel">
                      <SectionHeading title={t.quick} />
                      <div className="quick-actions">
                        <button type="button" onClick={() => openModal("student")}>
                          <Icon name="plus" size={18} />{t.addStudent}
                        </button>
                        <button type="button" onClick={() => openModal("subject")}>
                          <Icon name="plus" size={18} />{t.addSubject}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPage("tests");
                            setTestResult("");
                            setAnswer("");
                          }}
                        >
                          <Icon name="quiz" size={18} />{t.createTest}
                        </button>
                      </div>
                    </section>
                  </div>
                </>
              )}
            </>
          )}

          {page === "students" && (
            <section className="panel">
              <div className="panel-toolbar">
                <SectionHeading title={t.students} />
                <div className="toolbar-actions">
                  <div className="search-box">
                    <Icon name="search" size={17} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t.search}
                      aria-label={t.search}
                    />
                  </div>
                  {!isOwner && !isLearner && (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => openModal("student")}
                    >
                      <Icon name="plus" size={17} />{t.addStudent}
                    </button>
                  )}
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t.studentName}</th>
                      <th>{t.studentCode}</th>
                      <th>{t.group}</th>
                      <th>{t.status}</th>
                      <th>{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStudents.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div className="person-cell">
                            <div className="mini-avatar">{s.name.slice(0, 1)}</div>
                            {s.name}
                          </div>
                        </td>
                        <td><code>{s.code}</code></td>
                        <td>{groupLabel(t, s.group)}</td>
                        <td><span className="status-pill">{t.active}</span></td>
                        <td>
                          {!isOwner && (
                            <button
                              type="button"
                              className="text-action danger"
                              onClick={() => askDelete("student", s.id)}
                              aria-label={`${t.delete} ${s.name}`}
                            >
                              <Icon name="trash" size={14} /> {t.delete}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {visibleStudents.length === 0 && <p className="empty-state">{t.noItems}</p>}
              </div>
            </section>
          )}

          {page === "subjects" && (
            <>
              <div className="panel-toolbar">
                <SectionHeading title={isLearner ? t.myCourses : t.subjects} />
                {!isLearner && (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => openModal("subject")}
                  >
                    <Icon name="plus" size={17} />{t.addSubject}
                  </button>
                )}
              </div>

              <div className="subject-grid">
                {subjects.map((s) => (
                  <div className="subject-wrap" key={s.id}>
                    <SubjectCard subject={s} t={t} onClick={() => setPage("tests")} />
                    {!isLearner && (
                      <button
                        type="button"
                        className="text-action danger subject-delete"
                        onClick={() => askDelete("subject", s.id)}
                        aria-label={`${t.delete} ${s.name}`}
                      >
                        <Icon name="trash" size={14} /> {t.delete}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {subjects.length === 0 && <p className="empty-state">{t.noItems}</p>}
            </>
          )}

          {page === "tests" && (
            <section className="panel test-panel">
              <div className="test-top">
                <div className="test-icon"><Icon name="quiz" size={22} /></div>
                <span className="status-pill">{rtl ? "تجريبي" : "Demo"}</span>
              </div>
              <h2>{t.testTitle}</h2>
              <p className="muted">{t.testDesc}</p>

              <div className="question-box">
                <strong>{t.questionOf}</strong>
                <h3>{t.question}</h3>
                <div className="answers">
                  {[
                    ["a", t.answer1],
                    ["b", t.answer2],
                    ["c", t.answer3],
                  ].map(([v, label]) => (
                    <label
                      key={v}
                      className={`answer-option ${answer === v ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="answer"
                        value={v}
                        checked={answer === v}
                        onChange={() => {
                          setAnswer(v);
                          setTestResult("");
                        }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  className="primary-button"
                  disabled={!answer}
                  onClick={() => setTestResult(answer === "b" ? t.correct : t.wrong)}
                >
                  {t.submit}
                </button>
                {testResult && (
                  <div
                    className={answer === "b" ? "success-message" : "error-message"}
                    role="status"
                  >
                    {testResult}
                  </div>
                )}
              </div>
            </section>
          )}

          {page === "admins" && (
            <section className="panel">
              <div className="panel-toolbar">
                <SectionHeading title={t.adminsTitle} />
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => openModal("admin")}
                >
                  <Icon name="plus" size={17} />{t.addAdmin}
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t.adminName}</th>
                      <th>{t.email}</th>
                      <th>{t.group}</th>
                      <th>{t.groupCode}</th>
                      <th>{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((a) => (
                      <tr key={a.id}>
                        <td>{a.name}</td>
                        <td>{a.email || "—"}</td>
                        <td>{groupLabel(t, a.group)}</td>
                        <td><code>{a.code}</code></td>
                        <td>
                          <button
                            type="button"
                            className="text-action danger"
                            onClick={() => askDelete("admin", a.id)}
                            aria-label={`${t.delete} ${a.name}`}
                          >
                            <Icon name="trash" size={14} /> {t.delete}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {admins.length === 0 && <p className="empty-state">{t.noItems}</p>}
              </div>
            </section>
          )}

          {page === "chat" && (
            <section className="panel empty-panel">
              <div className="empty-illustration"><Icon name="chat" size={44} /></div>
              <h2>{t.chatTitle}</h2>
              <p className="muted">{t.chatHint}</p>
              <span className="coming-soon">{rtl ? "قريباً" : "Coming soon"}</span>
            </section>
          )}

          {page === "settings" && (
            <section className="panel settings-panel">
              <SectionHeading title={t.settingsTitle} />
              <div className="setting-row">
                <div>
                  <strong>{t.language}</strong>
                  <p className="muted">
                    {rtl ? "اختر لغة واجهة المنصة" : "Choose the interface language"}
                  </p>
                </div>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => setLang(lang === "ar" ? "en" : "ar")}
                >
                  {rtl ? "العربية" : "English"} <Icon name="arrow-left" size={15} />
                </button>
              </div>
              <div className="setting-row">
                <div>
                  <strong>{t.theme}</strong>
                  <p className="muted">
                    {rtl ? "تغيير مظهر المنصة" : "Change the platform appearance"}
                  </p>
                </div>
                <button type="button" className="outline-button" onClick={toggleTheme}>
                  <Icon name={dark ? "sun" : "moon"} size={15} />
                  {dark ? t.light : t.dark}
                </button>
              </div>
              <div className="setting-row">
                <div>
                  <strong>{t.resetData}</strong>
                  <p className="muted">{t.resetHint}</p>
                </div>
                <button type="button" className="outline-button" onClick={resetDemo}>
                  {t.resetData}
                </button>
              </div>
            </section>
          )}
        </div>

        <footer className="dashboard-footer">
          {t.footer} · © 2026 {t.brand}
        </footer>
      </main>

      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal("");
          }}
        >
          <form
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onSubmit={
              modal === "student" ? addStudent : modal === "subject" ? addSubject : addAdmin
            }
          >
            <div className="modal-heading">
              <h2 id="modal-title">
                {modal === "student" ? t.addStudent : modal === "subject" ? t.addSubject : t.addAdmin}
              </h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setModal("")}
                aria-label={t.close}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {modal === "student" && (
              <>
                <label>
                  {t.studentName}
                  <input
                    required
                    autoFocus
                    value={form.name || ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label>
                  {t.studentCode}
                  <input
                    value={form.code || ""}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder={nextCode(students, "STU", 1000)}
                  />
                </label>
                <label>
                  {t.group}
                  <select
                    value={form.group || "g1"}
                    onChange={(e) => setForm({ ...form, group: e.target.value })}
                  >
                    <option value="g1">{t.group1}</option>
                    <option value="g2">{t.group2}</option>
                  </select>
                </label>
              </>
            )}

            {modal === "subject" && (
              <>
                <label>
                  {t.subjectName}
                  <input
                    required
                    autoFocus
                    value={form.name || ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label>
                  {t.lessons}
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={form.lessons || ""}
                    onChange={(e) => setForm({ ...form, lessons: e.target.value })}
                  />
                </label>
              </>
            )}

            {modal === "admin" && (
              <>
                <label>
                  {t.adminName}
                  <input
                    required
                    autoFocus
                    value={form.name || ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label>
                  {t.email}
                  <input
                    type="email"
                    value={form.email || ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@demo.com"
                  />
                </label>
                <label>
                  {t.groupCode}
                  <input
                    value={form.code || ""}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder={nextCode(admins, "GRP", 100)}
                  />
                </label>
                <label>
                  {t.group}
                  <input
                    value={form.group || ""}
                    onChange={(e) => setForm({ ...form, group: e.target.value })}
                    placeholder={rtl ? "المجموعة الثالثة" : "Group Three"}
                  />
                </label>
              </>
            )}

            <div className="modal-actions">
              <button type="button" className="outline-button" onClick={() => setModal("")}>
                {t.cancel}
              </button>
              <button className="primary-button" type="submit">{t.save}</button>
            </div>
          </form>
        </div>
      )}

      {confirm && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirm(null);
          }}
        >
          <div
            className="modal-card confirm-card"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <div className="confirm-icon"><Icon name="trash" size={22} /></div>
            <h2 id="confirm-title">{t.deleteConfirm}</h2>
            <p className="muted">{t.deleteHint}</p>
            <div className="modal-actions">
              <button type="button" className="outline-button" onClick={() => setConfirm(null)}>
                {t.cancel}
              </button>
              <button type="button" className="primary-button danger-button" onClick={doDelete}>
                {t.yesDelete}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                             */
/* ------------------------------------------------------------------ */

function Brand({ t }) {
  return (
    <div className="brand">
      <img src="/404-logo.jpeg" alt="404" className="brand-logo" />
      <div className="brand-text">
        <strong>{t.brand}</strong>
        <small>{t.tagline}</small>
      </div>
    </div>
  );
}

function SectionHeading({ title }) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
    </div>
  );
}

function Stat({ icon, label, value, color }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}><Icon name={icon} size={20} /></div>
      <div className="stat-text">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="stat-spark" aria-hidden="true">↗</div>
    </div>
  );
}

function Activity({ icon, title, time }) {
  return (
    <div className="activity-item">
      <div className="activity-icon"><Icon name={icon} size={17} /></div>
      <div>
        <strong>{title}</strong>
        <small>{time}</small>
      </div>
      <span className="activity-dot" />
    </div>
  );
}

function SubjectCard({ subject, t, onClick }) {
  return (
    <button type="button" className={`subject-card ${subject.color}`} onClick={onClick}>
      <div className="subject-card-top">
        <div className="subject-symbol"><Icon name="book" size={19} /></div>
        <span aria-hidden="true">↗</span>
      </div>
      <h3>{subject.name}</h3>
      <p>{subject.lessons} {t.lessonsShort}</p>
      <div className="subject-progress">
        <span style={{ width: `${Math.min(100, subject.lessons * 8)}%` }} />
      </div>
      <small>{t.continue}</small>
    </button>
  );
}
