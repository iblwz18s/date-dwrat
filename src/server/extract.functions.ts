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

type ExtractResult = { ok: true; data: ExtractedCourseFields } | { ok: false; error: string };

const FREE_VISION_MODELS = [
  "google/gemma-3-12b-it:free",
  "google/gemma-3-4b-it:free",
  "google/gemma-3-27b-it:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "baidu/qianfan-ocr-fast:free",
];

function extractJsonObject(content: string): ExtractedCourseFields {
  const cleaned = content.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned) as ExtractedCourseFields;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return {};
    return JSON.parse(match[0]) as ExtractedCourseFields;
  }
}

export const extractCourseData = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<ExtractResult> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "OPENROUTER_API_KEY غير مهيأ" };
    }

    const systemPrompt = `أنت مساعد ذكي متخصص في استخراج بيانات الدورات التدريبية وورش العمل والمناقشات العلمية من صور الملصقات الإعلانية باللغة العربية والإنجليزية. استخرج البيانات بدقة وأرجعها بصيغة JSON فقط بدون أي نص إضافي.`;

    const userPrompt = `حلل صورة الملصق واستخرج البيانات التالية بصيغة JSON فقط:
{
  "title": "عنوان الدورة/الورشة/المناقشة",
  "date": "التاريخ بصيغة YYYY-MM-DD (حوّل التواريخ الهجرية للميلادية إن أمكن)",
  "startTime": "وقت البدء بصيغة HH:MM (24h)",
  "endTime": "وقت الانتهاء بصيغة HH:MM (24h). إن لم يُذكر، أضف ساعة واحدة على وقت البدء",
  "organizer": "الجهة المنظمة",
  "location": "مكان الانعقاد (أو عبر الإنترنت إن كانت أونلاين)",
  "description": "وصف مختصر إن وُجد",
  "registrationUrl": "رابط التسجيل إن وُجد نصياً"
}

استخدم null للحقول غير المتوفرة. أرجع JSON فقط بدون أي نص أو تعليق إضافي وبدون علامات markdown.`;

    try {
      const imageUrl = `data:${data.mimeType};base64,${data.imageBase64}`;
      const errors: string[] = [];

      for (const model of FREE_VISION_MODELS) {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://lovable.dev",
            "X-Title": "Smart Course Extractor",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  { type: "text", text: userPrompt },
                  { type: "image_url", image_url: { url: imageUrl } },
                ],
              },
            ],
            temperature: 0,
            max_tokens: 700,
          }),
        });

        if (!res.ok) {
          const txt = await res.text();
          if (res.status === 401) return { ok: false as const, error: "مفتاح OpenRouter غير صالح" };
          errors.push(`${model}: ${res.status} ${txt.slice(0, 120)}`);
          continue;
        }

        const json = await res.json();
        const content: string = json?.choices?.[0]?.message?.content ?? "{}";
        const parsed = extractJsonObject(content);
        if (Object.keys(parsed).length > 0) {
          return { ok: true as const, data: parsed };
        }
        errors.push(`${model}: empty response`);
      }

      console.error("OpenRouter extraction failed for all models:", errors);
      return {
        ok: false as const,
        error: "تعذّر استخراج البيانات عبر النماذج المجانية حالياً. حاول بصورة أوضح أو بعد قليل.",
      };
    } catch (err) {
      console.error("extractCourseData error:", err);
      return { ok: false as const, error: "حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي" };
    }
  });
