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
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "LOVABLE_API_KEY غير مهيأ" };
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
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                {
                  type: "image_url",
                  image_url: { url: `data:${data.mimeType};base64,${data.imageBase64}` },
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 429) return { ok: false as const, error: "تم تجاوز الحد المسموح. حاول لاحقاً." };
        if (res.status === 402) return { ok: false as const, error: "نفدت الأرصدة. يرجى إضافة رصيد." };
        return { ok: false as const, error: `فشل الاستخراج (${res.status}): ${txt.slice(0, 200)}` };
      }

      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content ?? "{}";
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(content);
      } catch {
        const m = content.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
      }
      return { ok: true as const, data: parsed };
    } catch (err) {
      console.error("extractCourseData error:", err);
      return { ok: false as const, error: "حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي" };
    }
  });
