import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles,
  UploadCloud,
  CalendarPlus,
  Bookmark,
  ExternalLink,
  Trash2,
  Eye,
  X,
  ClipboardList,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Building2,
  AlignLeft,
  Smartphone,
  Sun,
  Moon,
  ArrowLeft,
  QrCode,
  Bell,
  ImageIcon,
} from "lucide-react";
import { extractCourseData } from "@/lib/extract.functions";
import { fileToBase64, scanQrFromImage } from "@/lib/qr";
import {
  buildGoogleCalendarUrl,
  downloadIcs,
  isMobileDevice,
  type CourseEvent,
} from "@/lib/calendar";
import {
  saveCourse,
  listCourses,
  deleteCourse,
  type SavedCourse,
} from "@/lib/storage";

export const Route = createFileRoute("/")({
  component: Index,
});

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function Index() {
  const extractFn = useServerFn(extractCourseData);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<CourseEvent | null>(null);
  const [saved, setSaved] = useState<SavedCourse[]>([]);
  const [viewing, setViewing] = useState<SavedCourse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("theme");
    const prefersDark =
      stored === "dark" ||
      (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
  }, []);

  const toggleDark = () => {
    if (typeof window === "undefined") return;
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const refreshSaved = useCallback(async () => {
    setSaved(await listCourses());
  }, []);

  useEffect(() => {
    refreshSaved();
  }, [refreshSaved]);

  const onPick = (f: File | null) => {
    setError(null);
    setCourse(null);
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return url;
      });
    } else if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const onClear = () => {
    onPick(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onExtract = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setCourse(null);
    try {
      const [{ base64, mimeType }, qr] = await Promise.all([
        fileToBase64(file),
        scanQrFromImage(file),
      ]);
      const result = await extractFn({ data: { imageBase64: base64, mimeType } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const d = result.data;
      const today = new Date().toISOString().slice(0, 10);
      const ev: CourseEvent = {
        title: (d.title as string) || "دورة بدون عنوان",
        date: (d.date as string) || today,
        startTime: (d.startTime as string) || "09:00",
        endTime: (d.endTime as string) || "10:00",
        organizer: (d.organizer as string) ?? null,
        location: (d.location as string) ?? null,
        description: (d.description as string) ?? null,
        registrationUrl: (d.registrationUrl as string) ?? qr ?? null,
      };
      setCourse(ev);
    } catch (e) {
      console.error(e);
      setError("حدث خطأ غير متوقع أثناء الاستخراج");
    } finally {
      setLoading(false);
    }
  };

  const onSave = async () => {
    if (!course || !file) return;
    const imageDataUrl = await fileToDataUrl(file);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await saveCourse({ ...course, id, imageDataUrl, savedAt: Date.now() });
    await refreshSaved();
  };

  const handleAddToCalendar = (ev: CourseEvent, type: "google" | "device" = "google") => {
    if (type === "device") {
      downloadIcs(ev);
    } else {
      const url = buildGoogleCalendarUrl(ev);
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <main className="bg-paper min-h-screen text-ink">
      <TopBar isDark={isDark} onToggleDark={toggleDark} />

      <Hero />

      <ToolSection
        previewUrl={previewUrl}
        file={file}
        loading={loading}
        error={error}
        course={course}
        onPick={onPick}
        onExtract={onExtract}
        onClear={onClear}
        onSave={onSave}
        onAddToCalendar={handleAddToCalendar}
        inputRef={fileInputRef}
      />

      <SavedList
        courses={saved}
        onView={(c) => setViewing(c)}
        onDelete={async (id) => {
          await deleteCourse(id);
          await refreshSaved();
        }}
        onAddToCalendar={handleAddToCalendar}
      />

      <HowItWorks />

      <ShowcaseSection />

      <FeaturesBento />

      <FinalCTA />

      {viewing && (
        <Modal onClose={() => setViewing(null)}>
          <CourseDetails
            course={viewing}
            imageDataUrl={viewing.imageDataUrl}
            onAddToCalendar={(type) => handleAddToCalendar(viewing, type)}
          />
        </Modal>
      )}
    </main>
  );
}

/* ───────────────────────── TopBar ───────────────────────── */

function TopBar({ isDark, onToggleDark }: { isDark: boolean; onToggleDark: () => void }) {
  return (
    <div className="border-b border-border/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-xl font-bold tracking-tight">DWRAT</span>
          <span className="hidden text-stone-brand text-xs md:inline">— تواريخ الدورات</span>
        </div>
        <button
          onClick={onToggleDark}
          className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-stone-brand transition-colors hover:text-ink"
          aria-label={isDark ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"}
        >
          {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          <span>{isDark ? "نهاري" : "ليلي"}</span>
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── Hero ───────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-16 md:grid-cols-12 md:gap-8 md:px-10 md:pb-32 md:pt-24">
        {/* Text column (start side in RTL = visually right) */}
        <div className="flex flex-col justify-end md:col-span-7 md:pe-6">
          <div className="eyebrow flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-brand" />
            <span>مدعوم بالذكاء الاصطناعي · يفهم العربية</span>
          </div>

          <h1 className="font-display mt-6 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:mt-8 md:text-7xl lg:text-8xl">
            استخرج بيانات
            <br />
            الدورة من
            <span className="text-amber-brand"> الملصق</span>.
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-stone-brand md:mt-8 md:text-lg">
            ارفع صورة ملصق دورة أو ورشة، نستخرج التفاصيل تلقائياً ونضيفها لتقويمك
            خلال ثوانٍ.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3 md:mt-10">
            <a
              href="#tool"
              className="bg-amber-brand inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-soft transition-transform duration-150 active:scale-[0.97]"
            >
              <Sparkles className="h-4 w-4" />
              ابدأ الآن
              <ArrowLeft className="h-4 w-4" />
            </a>
            <a
              href="#how"
              className="text-ink inline-flex items-center gap-2 rounded-full border border-ink/20 px-6 py-3 text-sm font-medium transition-colors hover:bg-ink/5"
            >
              كيف يعمل؟
            </a>
          </div>

          <div className="mt-10 flex items-center gap-2 text-xs text-stone-brand md:mt-12">
            <Sparkles className="h-3.5 w-3.5 text-amber-brand" />
            <span>تطوير الأستاذ أسامة البلوي</span>
          </div>
        </div>

        {/* Visual placeholder column (end side in RTL = visually left) */}
        <div className="md:col-span-5">
          <PosterPlaceholder />
        </div>
      </div>
    </section>
  );
}

function PosterPlaceholder() {
  return (
    <div className="relative aspect-[4/5] w-full">
      {/* Corner markers (editorial registration marks) */}
      <CornerMark className="-start-2 -top-2" />
      <CornerMark className="-end-2 -top-2 rotate-90" />
      <CornerMark className="-end-2 -bottom-2 rotate-180" />
      <CornerMark className="-start-2 -bottom-2 -rotate-90" />

      <div className="relative h-full w-full overflow-hidden rounded-sm border border-ink/10">
        <img
          src="/images/bento/posters-grid.jpg"
          alt="أمثلة على ملصقات الدورات العربية"
          className="h-full w-full object-cover"
        />
        {/* Bottom gradient scrim */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/50 to-transparent" />

        {/* Top-start label */}
        <div className="absolute start-4 top-4 flex items-center gap-1.5 rounded-full bg-ink/60 px-2.5 py-1 text-[10px] tracking-widest text-paper/90 backdrop-blur-sm">
          <span className="h-1 w-1 rounded-full bg-amber-brand" />
          POSTER · 01
        </div>

        {/* Bottom-end label */}
        <div className="absolute bottom-4 end-4 text-[10px] tracking-widest text-paper/70">
          AR · RTL
        </div>
      </div>
    </div>
  );
}

function CornerMark({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute h-4 w-4 ${className}`} aria-hidden>
      <span className="absolute start-0 top-0 h-px w-4 bg-ink/40" />
      <span className="absolute start-0 top-0 h-4 w-px bg-ink/40" />
    </div>
  );
}

/* ───────────────────────── Tool Section ───────────────────────── */

function ToolSection({
  previewUrl,
  file,
  loading,
  error,
  course,
  onPick,
  onExtract,
  onClear,
  onSave,
  onAddToCalendar,
  inputRef,
}: {
  previewUrl: string | null;
  file: File | null;
  loading: boolean;
  error: string | null;
  course: CourseEvent | null;
  onPick: (f: File | null) => void;
  onExtract: () => void;
  onClear: () => void;
  onSave: () => void;
  onAddToCalendar: (c: CourseEvent, type?: "google" | "device") => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <section id="tool" className="border-t border-ink/10">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <SectionEyebrow num="٠١" label="الأداة" />
        <h2 className="font-display mt-4 max-w-2xl text-3xl font-bold leading-tight tracking-tight md:text-5xl">
          ارفع الملصق، استلم
          <span className="text-amber-brand"> البيانات النظيفة</span>.
        </h2>

        <div className="mt-12 grid gap-px overflow-hidden rounded-sm border border-ink/10 bg-ink/10 md:grid-cols-2">
          <UploadPanel
            previewUrl={previewUrl}
            file={file}
            loading={loading}
            error={error}
            onPick={onPick}
            onExtract={onExtract}
            onClear={onClear}
            inputRef={inputRef}
          />
          <ResultPanel
            loading={loading}
            course={course}
            onSave={onSave}
            onAddToCalendar={onAddToCalendar}
          />
        </div>
      </div>
    </section>
  );
}

function SectionEyebrow({ num, label }: { num: string; label: string }) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="display-num text-amber-brand text-3xl">{num}</span>
      <span className="eyebrow">{label}</span>
      <span className="h-px flex-1 bg-ink/10" />
    </div>
  );
}

function UploadPanel({
  previewUrl,
  file,
  loading,
  error,
  onPick,
  onExtract,
  onClear,
  inputRef,
}: {
  previewUrl: string | null;
  file: File | null;
  loading: boolean;
  error: string | null;
  onPick: (f: File | null) => void;
  onExtract: () => void;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <div className="bg-paper p-6 md:p-8">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-lg font-bold">رفع الصورة</h3>
        <span className="text-[10px] tracking-widest text-stone-brand">STEP · 01</span>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onPick(f);
        }}
        className={`relative mt-5 flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-sm border border-dashed transition-colors ${
          dragOver
            ? "border-amber-brand bg-amber-brand/5"
            : "border-ink/20 bg-paper-deep/40 hover:bg-paper-deep/70"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="معاينة الملصق"
            className="max-h-[360px] w-full rounded-sm object-contain p-3"
          />
        ) : (
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            <div className="border-ink/15 flex h-14 w-14 items-center justify-center rounded-full border bg-paper">
              <UploadCloud className="h-6 w-6 text-stone-brand" strokeWidth={1.4} />
            </div>
            <div>
              <div className="text-sm font-medium text-ink">اسحب الصورة هنا</div>
              <div className="mt-1 text-xs text-stone-brand">أو انقر للاختيار · JPG / PNG / WEBP</div>
            </div>
          </div>
        )}
      </label>

      {error && (
        <div className="mt-4 rounded-sm border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={onExtract}
          disabled={!file || loading}
          className="bg-amber-brand inline-flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-soft transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <>
              <Spinner /> جاري الاستخراج...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> استخراج البيانات
            </>
          )}
        </button>
        <button
          onClick={onClear}
          disabled={!file || loading}
          className="rounded-full border border-ink/20 bg-transparent px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink/5 disabled:opacity-40"
        >
          مسح
        </button>
      </div>
    </div>
  );
}

function ResultPanel({
  loading,
  course,
  onSave,
  onAddToCalendar,
}: {
  loading: boolean;
  course: CourseEvent | null;
  onSave: () => void;
  onAddToCalendar: (c: CourseEvent, type?: "google" | "device") => void;
}) {
  return (
    <div className="bg-paper p-6 md:p-8">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-lg font-bold">البيانات المستخرجة</h3>
        <span className="text-[10px] tracking-widest text-stone-brand">STEP · 02</span>
      </div>

      {loading && (
        <div className="mt-5 flex min-h-[280px] flex-col items-center justify-center gap-3 text-stone-brand">
          <Spinner large />
          <p className="text-sm">يحلّل الذكاء الاصطناعي الصورة...</p>
        </div>
      )}
      {!loading && !course && (
        <div className="mt-5 flex min-h-[280px] flex-col items-center justify-center gap-4 text-center text-sm text-stone-brand">
          <div className="border-ink/15 flex h-14 w-14 items-center justify-center rounded-full border bg-paper-deep/40">
            <ClipboardList className="h-6 w-6 text-stone-brand" strokeWidth={1.4} />
          </div>
          <p>ستظهر تفاصيل الدورة هنا بعد الاستخراج</p>
        </div>
      )}
      {course && (
        <div className="mt-5 space-y-3">
          <CourseFields course={course} />
          <div className="flex flex-wrap gap-2 pt-3">
            <button
              onClick={() => onAddToCalendar(course, "google")}
              className="bg-amber-brand inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-white shadow-soft transition-transform duration-150 active:scale-[0.97]"
            >
              <CalendarPlus className="h-4 w-4" />
              Google Calendar
            </button>
            <button
              onClick={() => onAddToCalendar(course, "device")}
              className="border-ink/20 inline-flex flex-1 items-center justify-center gap-2 rounded-full border bg-transparent px-4 py-3 text-sm font-bold text-ink transition-colors hover:bg-ink/5"
            >
              <Smartphone className="h-4 w-4" />
              تقويم الجهاز
            </button>
            <button
              onClick={onSave}
              className="border-ink/20 inline-flex items-center gap-2 rounded-full border bg-transparent px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
            >
              <Bookmark className="h-4 w-4" />
              حفظ
            </button>
            {course.registrationUrl && (
              <a
                href={course.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border-ink/20 inline-flex items-center gap-2 rounded-full border bg-transparent px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
              >
                <ExternalLink className="h-4 w-4" />
                التسجيل
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CourseFields({ course }: { course: CourseEvent }) {
  return (
    <dl className="divide-y divide-ink/10 border-y border-ink/10">
      <Field label="العنوان" value={course.title} highlight />
      <div className="grid grid-cols-2 divide-x divide-x-reverse divide-ink/10">
        <Field label="التاريخ" value={course.date} icon={<CalendarIcon className="h-3.5 w-3.5" />} />
        <Field label="الوقت" value={`${course.startTime} - ${course.endTime}`} icon={<Clock className="h-3.5 w-3.5" />} />
      </div>
      {course.organizer && <Field label="الجهة المنظمة" value={course.organizer} icon={<Building2 className="h-3.5 w-3.5" />} />}
      {course.location && <Field label="الموقع" value={course.location} icon={<MapPin className="h-3.5 w-3.5" />} />}
      {course.description && <Field label="الوصف" value={course.description} icon={<AlignLeft className="h-3.5 w-3.5" />} />}
    </dl>
  );
}

function Field({
  label,
  value,
  highlight,
  icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="px-1 py-3">
      <dt className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-stone-brand">
        {icon}
        <span>{label}</span>
      </dt>
      <dd className={`mt-1.5 text-ink ${highlight ? "font-display text-xl font-bold" : "text-sm"}`}>
        {value}
      </dd>
    </div>
  );
}

/* ───────────────────────── Saved List ───────────────────────── */

function SavedList({
  courses,
  onView,
  onDelete,
  onAddToCalendar,
}: {
  courses: SavedCourse[];
  onView: (c: SavedCourse) => void;
  onDelete: (id: string) => void;
  onAddToCalendar: (c: CourseEvent, type?: "google" | "device") => void;
}) {
  if (courses.length === 0) return null;
  return (
    <section className="border-t border-ink/10">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <SectionEyebrow num="٠٢" label="المحفوظات" />
        <div className="mt-4 flex items-end justify-between gap-6">
          <h2 className="font-display max-w-2xl text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            الدورات المحفوظة
          </h2>
          <span className="text-stone-brand text-sm">{courses.length} دورة</span>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-sm border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <article key={c.id} className="bg-paper group flex flex-col">
              {c.imageDataUrl ? (
                <div className="bg-paper-deep aspect-[16/10] w-full overflow-hidden">
                  <img
                    src={c.imageDataUrl}
                    alt={c.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
              ) : (
                <div className="bg-paper-deep flex aspect-[16/10] w-full items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-stone-brand" strokeWidth={1} />
                </div>
              )}
              <div className="flex flex-1 flex-col gap-3 p-5">
                <h3 className="font-display line-clamp-2 text-lg font-bold leading-snug">
                  {c.title}
                </h3>
                {c.organizer && (
                  <p className="flex items-center gap-1.5 text-xs text-stone-brand">
                    <Building2 className="h-3 w-3" />
                    {c.organizer}
                  </p>
                )}
                <p className="flex items-center gap-1.5 text-xs text-stone-brand">
                  <CalendarIcon className="h-3 w-3" />
                  {c.date}
                  <span className="opacity-50">·</span>
                  <Clock className="h-3 w-3" />
                  {c.startTime}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-3">
                  <button
                    onClick={() => onAddToCalendar(c, "google")}
                    className="bg-amber-brand inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-white transition-transform duration-150 active:scale-[0.97]"
                    aria-label="Google Calendar"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    Google
                  </button>
                  <button
                    onClick={() => onAddToCalendar(c, "device")}
                    className="border-ink/20 inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border bg-transparent px-3 py-2 text-xs font-bold text-ink transition-colors hover:bg-ink/5"
                    aria-label="تقويم الجهاز"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    الجهاز
                  </button>
                  <button
                    onClick={() => onView(c)}
                    className="border-ink/20 inline-flex items-center gap-1.5 rounded-full border bg-transparent px-3 py-2 text-xs text-ink transition-colors hover:bg-ink/5"
                    aria-label="عرض"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(c.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-transparent px-3 py-2 text-xs text-destructive transition-colors hover:bg-destructive/10"
                    aria-label="حذف"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── How It Works ───────────────────────── */

function HowItWorks() {
  const steps = [
    {
      num: "٠١",
      title: "ارفع الصورة",
      caption: "أي ملصق دورة أو ورشة بصيغة JPG, PNG, أو WEBP.",
      icon: <UploadCloud className="h-5 w-5" strokeWidth={1.4} />,
    },
    {
      num: "٠٢",
      title: "نستخرج التفاصيل",
      caption: "العنوان، الوقت، التاريخ، الموقع، الجهة المنظمة، ورابط التسجيل تلقائياً.",
      icon: <QrCode className="h-5 w-5" strokeWidth={1.4} />,
    },
    {
      num: "٠٣",
      title: "أضف للتقويم",
      caption: "بنقرة واحدة إلى Google Calendar أو تقويم الجهاز، مع تذكير مسبق.",
      icon: <CalendarPlus className="h-5 w-5" strokeWidth={1.4} />,
    },
  ];

  return (
    <section id="how" className="border-t border-ink/10">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <SectionEyebrow num="٠٣" label="كيف يعمل" />
        <h2 className="font-display mt-4 max-w-2xl text-3xl font-bold leading-tight tracking-tight md:text-5xl">
          ثلاث خطوات. ثوانٍ معدودة.
        </h2>

        <div className="mt-12 grid divide-y divide-ink/10 border-y border-ink/10 md:grid-cols-3 md:divide-x md:divide-x-reverse md:divide-y-0">
          {steps.map((s) => (
            <div key={s.num} className="flex flex-col gap-6 px-2 py-8 md:px-8">
              <div className="flex items-baseline justify-between">
                <span className="display-num text-stone-brand/40 text-6xl">{s.num}</span>
                <div className="border-ink/15 flex h-10 w-10 items-center justify-center rounded-full border text-ink">
                  {s.icon}
                </div>
              </div>
              <div>
                <h3 className="font-display text-xl font-bold leading-tight">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-stone-brand">{s.caption}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <a
            href="#tool"
            className="text-ink group inline-flex items-center gap-2 text-sm font-medium underline decoration-ink/30 underline-offset-4 transition-colors hover:decoration-amber-brand"
          >
            جرّبها الآن
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Features Bento ───────────────────────── */

function FeaturesBento() {
  return (
    <section className="border-t border-ink/10">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <SectionEyebrow num="٠٤" label="المزايا" />
        <h2 className="font-display mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight md:text-5xl">
          أداة واحدة. كل ما تحتاجه
          <span className="text-amber-brand"> لتنظيم دوراتك</span>.
        </h2>

        <div className="mt-12 grid gap-px overflow-hidden rounded-sm border border-ink/10 bg-ink/10 md:grid-cols-3 md:grid-rows-2">
          {/* Cell 1 — Arabic identity, large (spans 2 cols) with dates texture */}
          <BentoCell className="bg-ink md:col-span-2 md:row-span-1">
            <div className="relative flex h-full min-h-[200px] flex-col justify-between overflow-hidden p-8 text-paper">
              <div className="absolute inset-0 opacity-20">
                <div className="hairline-grid h-full w-full" />
              </div>
              <div className="relative flex items-center gap-2 text-[10px] tracking-widest text-paper/60">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-brand" />
                هوية محلية
              </div>
              <div className="relative">
                <h3 className="font-display text-2xl font-bold leading-tight md:text-3xl">
                  مصممة للمحتوى العربي
                </h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-paper/70">
                  يفهم الذكاء الاصطناعي ملصقات الدورات بالعربية مباشرة، دون ترجمة وسيطة،
                  مع دقة استخراج عالية للتواريخ والأوقات الهجرية والميلادية.
                </p>
              </div>
            </div>
          </BentoCell>

          {/* Cell 2 — QR with image background */}
          <BentoCell>
            <div className="relative flex h-full min-h-[200px] flex-col justify-between overflow-hidden">
              <img
                src="/images/bento/qr-scan.jpg"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-ink/68" />
              <div className="relative z-10 flex h-full flex-col justify-between gap-6 p-6 md:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-paper/20 text-paper">
                  <QrCode className="h-6 w-6" strokeWidth={1.2} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold leading-tight text-paper">قارئ QR مدمج</h3>
                  <p className="mt-2 text-sm leading-relaxed text-paper/70">
                    يستخرج رابط التسجيل تلقائياً من رمز QR في الملصق.
                  </p>
                </div>
              </div>
            </div>
          </BentoCell>

          {/* Cell 3 — Google Calendar */}
          <BentoCell>
            <BentoIconCell
              icon={<CalendarPlus className="h-6 w-6" strokeWidth={1.2} />}
              title="متوافق مع التقاويم"
              caption="Google Calendar وApple Calendar وكل تطبيق يدعم ICS."
            />
          </BentoCell>

          {/* Cell 4 — PWA */}
          <BentoCell>
            <BentoIconCell
              icon={<Smartphone className="h-6 w-6" strokeWidth={1.2} />}
              title="يعمل على جوّالك"
              caption="PWA — أضفه لشاشة هاتفك واستخدمه كتطبيق أصلي."
            />
          </BentoCell>

          {/* Cell 5 — Reminders */}
          <BentoCell>
            <BentoIconCell
              icon={<Bell className="h-6 w-6" strokeWidth={1.2} />}
              title="تذكير قبل البداية"
              caption="نضيف تنبيهاً تلقائياً قبل بداية الدورة بنصف ساعة."
            />
          </BentoCell>
        </div>
      </div>
    </section>
  );
}

function BentoCell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-paper ${className}`}>{children}</div>;
}

function BentoIconCell({
  icon,
  title,
  caption,
}: {
  icon: React.ReactNode;
  title: string;
  caption: string;
}) {
  return (
    <div className="flex h-full min-h-[200px] flex-col justify-between gap-6 p-6 md:p-8">
      <div className="border-ink/15 flex h-12 w-12 items-center justify-center rounded-full border text-ink">
        {icon}
      </div>
      <div>
        <h3 className="font-display text-lg font-bold leading-tight">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-stone-brand">{caption}</p>
      </div>
    </div>
  );
}

/* ───────────────────────── Showcase ───────────────────────── */

function ShowcaseSection() {
  return (
    <section className="border-t border-ink/10">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-20">
          {/* Image — first in DOM, visually left (end in RTL) */}
          <div className="order-2 md:order-1">
            <img
              src="/images/showcase/app-preview.jpg"
              alt="معاينة نتائج استخراج بيانات الدورة على الجوال والويب"
              className="w-full rounded-sm shadow-elegant"
            />
          </div>

          {/* Text — second in DOM, visually right (start in RTL) */}
          <div className="order-1 md:order-2">
            <div className="eyebrow flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-brand" />
              <span>النتيجة الفورية</span>
            </div>
            <h2 className="font-display mt-4 text-3xl font-bold leading-tight tracking-tight md:text-5xl">
              البيانات جاهزة.
              <br />
              <span className="text-amber-brand">التقويم ينتظر</span>.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-stone-brand">
              يستخرج الذكاء الاصطناعي عنوان الدورة وتاريخها ووقتها وموقعها وجهة التنظيم ورابط التسجيل — كلها منظّمة وجاهزة للإضافة بنقرة واحدة إلى أي تقويم.
            </p>
            <a
              href="#tool"
              className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-ink underline decoration-ink/30 underline-offset-4 transition-colors hover:decoration-amber-brand"
            >
              جرّب الآن
              <ArrowLeft className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Final CTA + Footer ───────────────────────── */

function FinalCTA() {
  return (
    <section className="relative">
      {/* Diptych — paper top, ink bottom */}
      <div className="bg-paper px-6 pb-32 pt-20 md:px-10 md:pb-40 md:pt-28">
        <div className="mx-auto max-w-4xl text-center">
          <span className="eyebrow">جاهز؟</span>
          <h2 className="font-display mx-auto mt-4 max-w-2xl text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            حوّل أي ملصق إلى موعد في تقويمك
            <span className="text-amber-brand"> خلال ثوانٍ</span>.
          </h2>
        </div>
      </div>

      {/* Amber CTA bar sitting on the seam */}
      <div className="absolute start-0 end-0 top-full z-10 -translate-y-1/2">
        <div className="mx-auto max-w-3xl px-6">
          <a
            href="#tool"
            className="bg-amber-brand group flex items-center justify-between rounded-full px-8 py-5 text-white shadow-elegant transition-transform duration-150 active:scale-[0.99]"
          >
            <span className="font-display text-lg font-bold md:text-xl">ابدأ الآن — مجاناً تماماً</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:-translate-x-1">
              <ArrowLeft className="h-5 w-5" />
            </span>
          </a>
        </div>
      </div>

      {/* Ink half */}
      <div className="bg-ink px-6 pb-10 pt-28 text-paper md:px-10 md:pb-12 md:pt-32">
        <div className="mx-auto max-w-7xl">
          <div className="h-px w-full bg-amber-brand/40" />
          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-display text-xl font-bold">DWRAT</div>
              <div className="mt-1 text-xs text-paper/60">تواريخ الدورات · تطوير الأستاذ أسامة البلوي</div>
            </div>
            <div className="flex items-center gap-6 text-sm text-paper/70">
              <a href="#" className="hover:text-paper">الخصوصية</a>
              <span className="text-paper/30">·</span>
              <a href="#" className="hover:text-paper">التواصل</a>
              <span className="text-paper/30">·</span>
              <a href="#" className="hover:text-paper">GitHub</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Modal & Course Details ───────────────────────── */

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-paper relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-sm border border-ink/10 p-6 shadow-elegant"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute end-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink/20 bg-paper text-stone-brand transition-colors hover:bg-ink/5 hover:text-ink"
          aria-label="إغلاق"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

function CourseDetails({
  course,
  imageDataUrl,
  onAddToCalendar,
}: {
  course: CourseEvent;
  imageDataUrl?: string;
  onAddToCalendar: (type: "google" | "device") => void;
}) {
  return (
    <div className="space-y-5">
      {imageDataUrl && (
        <img
          src={imageDataUrl}
          alt={course.title}
          className="max-h-80 w-full rounded-sm object-contain"
        />
      )}
      <CourseFields course={course} />
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          onClick={() => onAddToCalendar("google")}
          className="bg-amber-brand inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-white shadow-soft transition-transform duration-150 active:scale-[0.97]"
        >
          <CalendarPlus className="h-4 w-4" />
          Google Calendar
        </button>
        <button
          onClick={() => onAddToCalendar("device")}
          className="border-ink/20 inline-flex flex-1 items-center justify-center gap-2 rounded-full border bg-transparent px-4 py-3 text-sm font-bold text-ink transition-colors hover:bg-ink/5"
        >
          <Smartphone className="h-4 w-4" />
          تقويم الجهاز
        </button>
        {course.registrationUrl && (
          <a
            href={course.registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border-ink/20 inline-flex items-center gap-2 rounded-full border bg-transparent px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
          >
            <ExternalLink className="h-4 w-4" />
            رابط التسجيل
          </a>
        )}
      </div>
    </div>
  );
}

function Spinner({ large }: { large?: boolean }) {
  const size = large ? "h-8 w-8" : "h-4 w-4";
  return (
    <span
      className={`${size} inline-block animate-spin rounded-full border-2 border-current border-t-transparent`}
    />
  );
}
