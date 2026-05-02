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
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "google/gemma-3-12b-it:free",
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

function getProviderErrorText(body: string): string {
  try {
    const parsed = JSON.parse(body);
    const raw = parsed?.error?.metadata?.raw;
    if (typeof raw === "string") return raw.slice(0, 240);
    const message = parsed?.error?.message;
    if (typeof message === "string") return message.slice(0, 240);
  } catch {
    // keep the original response text below
  }
  return body.slice(0, 240);
}

async function extractWithGeminiDirect(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  prompt: string,
): Promise<ExtractedCourseFields | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 700,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!res.ok) {
    console.error("Gemini direct extraction failed:", res.status, (await res.text()).slice(0, 240));
    return null;
  }

  const json = await res.json();
  const content =
    json?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("\n") ?? "{}";
  const parsed = extractJsonObject(content);
  return Object.keys(parsed).length > 0 ? parsed : null;
}

export const extractCourseData = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<ExtractResult> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!apiKey && !geminiApiKey) {
      return { ok: false as const, error: "مفتاح الذكاء الاصطناعي غير مهيأ" };
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

      for (const model of apiKey ? FREE_VISION_MODELS : []) {
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
          if (res.status === 404 || res.status === 410) {
            errors.push(`${model}: النموذج غير متاح حالياً (${res.status})`);
          } else {
            errors.push(`${model}: ${res.status} ${getProviderErrorText(txt)}`);
          }
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

      if (geminiApiKey) {
        const directGeminiResult = await extractWithGeminiDirect(
          geminiApiKey,
          data.imageBase64,
          data.mimeType,
          `${systemPrompt}\n\n${userPrompt}`,
        );
        if (directGeminiResult) {
          return { ok: true as const, data: directGeminiResult };
        }
      }

      console.error("AI extraction failed for all providers:", errors);
      return {
        ok: false as const,
        error: "تعذّر استخراج البيانات عبر الخدمات المجانية حالياً. حاول بصورة أوضح أو بعد قليل.",
      };
    } catch (err) {
      console.error("extractCourseData error:", err);
      return { ok: false as const, error: "حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي" };
    }
  });
