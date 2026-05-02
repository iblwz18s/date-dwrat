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
  Bell,
} from "lucide-react";
import { extractCourseData } from "@/server/extract.functions";
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

  const handleAddToCalendar = (ev: CourseEvent) => {
    const url = buildGoogleCalendarUrl(ev);
    if (isMobileDevice()) {
      // على الجوال: نزّل ملف ICS ليُفتح في تقويم الجهاز
      downloadIcs(ev);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 md:py-16">
      <div className="mx-auto max-w-6xl">
        <Header />

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <UploadPanel
            previewUrl={previewUrl}
            file={file}
            loading={loading}
            error={error}
            onPick={onPick}
            onExtract={onExtract}
            onClear={onClear}
            inputRef={fileInputRef}
          />
          <ResultPanel
            loading={loading}
            course={course}
            onSave={onSave}
            onAddToCalendar={handleAddToCalendar}
          />
        </section>

        <SavedList
          courses={saved}
          onView={(c) => setViewing(c)}
          onDelete={async (id) => {
            await deleteCourse(id);
            await refreshSaved();
          }}
          onAddToCalendar={handleAddToCalendar}
        />

        {viewing && (
          <Modal onClose={() => setViewing(null)}>
            <CourseDetails
              course={viewing}
              imageDataUrl={viewing.imageDataUrl}
              onAddToCalendar={() => handleAddToCalendar(viewing)}
            />
          </Modal>
        )}

        <footer className="mt-16 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <Bell className="h-4 w-4" />
          <span>صُنع بحب — تذكير تلقائي قبل بدء الدورة بنصف ساعة</span>
        </footer>
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft">
        <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        مدعوم بالذكاء الاصطناعي
      </div>
      <h1 className="font-display mt-6 text-4xl font-black tracking-tight md:text-6xl">
        <span className="bg-gradient-primary bg-clip-text text-transparent">
          مستخرج بيانات الدورات الذكي
        </span>
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
        ارفع صورة ملصق دورة أو ورشة أو مناقشة علمية، نستخرج التفاصيل تلقائياً —
        ثم نضيفها لتقويمك مع تذكير قبل البداية بنصف ساعة.
      </p>
    </header>
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
    <div className="glass rounded-2xl border border-border p-5 shadow-soft">
      <h2 className="mb-4 text-lg font-bold">رفع الصورة</h2>
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
        className={`relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30 hover:bg-muted/50"
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
            className="max-h-[360px] w-full rounded-xl object-contain p-3"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-elegant">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="text-sm font-medium">اسحب صورة الملصق هنا، أو انقر للاختيار</div>
            <div className="text-xs text-muted-foreground">JPG / PNG / WEBP</div>
          </div>
        )}
      </label>

      {error && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          onClick={onExtract}
          disabled={!file || loading}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-elegant transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Spinner /> جاري الاستخراج...
            </>
          ) : (
            <>✨ استخراج البيانات</>
          )}
        </button>
        <button
          onClick={onClear}
          disabled={!file || loading}
          className="rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
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
  onAddToCalendar: (c: CourseEvent) => void;
}) {
  return (
    <div className="glass rounded-2xl border border-border p-5 shadow-soft">
      <h2 className="mb-4 text-lg font-bold">البيانات المستخرجة</h2>
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <Spinner large />
          <p className="text-sm">يحلّل الذكاء الاصطناعي الصورة...</p>
        </div>
      )}
      {!loading && !course && (
        <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <div className="text-3xl">📋</div>
          <p>ستظهر تفاصيل الدورة هنا بعد الاستخراج</p>
        </div>
      )}
      {course && (
        <div className="space-y-3">
          <CourseFields course={course} />
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={() => onAddToCalendar(course)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-elegant hover:opacity-95"
            >
              📅 إضافة إلى التقويم
            </button>
            <button
              onClick={onSave}
              className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-muted"
            >
              حفظ
            </button>
            {course.registrationUrl && (
              <a
                href={course.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-medium text-accent-foreground hover:bg-accent/20"
              >
                🔗 رابط التسجيل
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
    <dl className="space-y-2 text-sm">
      <Field label="العنوان" value={course.title} highlight />
      <div className="grid grid-cols-2 gap-2">
        <Field label="التاريخ" value={course.date} />
        <Field label="الوقت" value={`${course.startTime} - ${course.endTime}`} />
      </div>
      {course.organizer && <Field label="الجهة المنظمة" value={course.organizer} />}
      {course.location && <Field label="الموقع" value={course.location} />}
      {course.description && <Field label="الوصف" value={course.description} />}
    </dl>
  );
}

function Field({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className={`mt-1 ${highlight ? "text-base font-bold" : "text-sm"} text-foreground`}>
        {value}
      </dd>
    </div>
  );
}

function SavedList({
  courses,
  onView,
  onDelete,
  onAddToCalendar,
}: {
  courses: SavedCourse[];
  onView: (c: SavedCourse) => void;
  onDelete: (id: string) => void;
  onAddToCalendar: (c: CourseEvent) => void;
}) {
  if (courses.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="mb-4 text-xl font-bold">الدورات المحفوظة</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
          <article
            key={c.id}
            className="group glass overflow-hidden rounded-2xl border border-border shadow-soft transition-all hover:shadow-elegant"
          >
            {c.imageDataUrl && (
              <div className="aspect-video w-full overflow-hidden bg-muted">
                <img
                  src={c.imageDataUrl}
                  alt={c.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
            )}
            <div className="space-y-2 p-4">
              <h3 className="line-clamp-2 font-bold">{c.title}</h3>
              {c.organizer && (
                <p className="text-xs text-muted-foreground">{c.organizer}</p>
              )}
              <p className="text-xs text-muted-foreground">
                📅 {c.date} • {c.startTime}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => onAddToCalendar(c)}
                  className="flex-1 rounded-lg bg-gradient-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                >
                  إضافة للتقويم
                </button>
                <button
                  onClick={() => onView(c)}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs hover:bg-muted"
                >
                  عرض
                </button>
                <button
                  onClick={() => onDelete(c.id)}
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive hover:bg-destructive/20"
                >
                  حذف
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-elegant"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute left-4 top-4 rounded-full border border-border bg-background p-2 text-muted-foreground hover:bg-muted"
          aria-label="إغلاق"
        >
          ✕
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
  onAddToCalendar: () => void;
}) {
  return (
    <div className="space-y-4">
      {imageDataUrl && (
        <img
          src={imageDataUrl}
          alt={course.title}
          className="max-h-80 w-full rounded-xl object-contain"
        />
      )}
      <CourseFields course={course} />
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          onClick={onAddToCalendar}
          className="flex-1 rounded-xl bg-gradient-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-elegant"
        >
          📅 إضافة إلى التقويم
        </button>
        {course.registrationUrl && (
          <a
            href={course.registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-medium hover:bg-accent/20"
          >
            🔗 رابط التسجيل
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
