import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  imageBase64: z.string().min(10),
  mimeType: z.string().default("image/jpeg"),
});

export interface ExtractedCourseFields {
  title?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  organizer?: string | null;
  location?: string | null;
  description?: string | null;
  registrationUrl?: string | null;
}

type ExtractResult =
  | { ok: true; data: ExtractedCourseFields }
  | { ok: false; error: string };

export const extractCourseData = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<ExtractResult> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "GEMINI_API_KEY غير مهيأ" };
    }

    const systemPrompt = `أنت مساعد ذكي متخصص في استخراج بيانات الدورات التدريبية وورش العمل والمناقشات العلمية من صور الملصقات الإعلانية باللغة العربية والإنجليزية. استخرج البيانات بدقة وأرجعها بصيغة JSON فقط.`;

    const userPrompt = `حلل صورة الملصق واستخرج البيانات التالية بصيغة JSON:
- title: عنوان الدورة/الورشة/المناقشة
- date: التاريخ بصيغة YYYY-MM-DD (حوّل التواريخ الهجرية للميلادية إن أمكن)
- startTime: وقت البدء بصيغة HH:MM (24h)
- endTime: وقت الانتهاء بصيغة HH:MM (24h). إن لم يُذكر، أضف ساعة واحدة على وقت البدء
- organizer: الجهة المنظمة
- location: مكان الانعقاد (أو "عبر الإنترنت" إن كانت أونلاين)
- description: وصف مختصر إن وُجد
- registrationUrl: رابط التسجيل إن وُجد نصياً

أرجع JSON فقط بدون أي نص إضافي. استخدم null للحقول غير المتوفرة.`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [
            {
              role: "user",
              parts: [
                { text: userPrompt },
                { inline_data: { mime_type: data.mimeType, data: data.imageBase64 } },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json" },
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 429) return { ok: false as const, error: "تم تجاوز الحد المجاني اليومي. حاول غداً." };
        return { ok: false as const, error: `فشل الاستخراج (${res.status}): ${txt.slice(0, 200)}` };
      }

      const json = await res.json();
      const content =
        json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "{}";
      let parsed: ExtractedCourseFields = {};
      try {
        parsed = JSON.parse(content) as ExtractedCourseFields;
      } catch {
        const m = content.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]) as ExtractedCourseFields;
      }
      return { ok: true as const, data: parsed };
    } catch (err) {
      console.error("extractCourseData error:", err);
      return { ok: false as const, error: "حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي" };
    }
  });
