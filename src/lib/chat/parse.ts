import { z } from "zod";

import { buddyReplySchema, safetyFlagSchema, type BuddyReply } from "./types";

/**
 * แปลง JSON ที่โมเดลตอบกลับมาให้เป็นโครงที่แอปใช้ได้
 *
 * แยกออกมาเป็นฟังก์ชันบริสุทธิ์เพราะนี่คือจุดที่พังง่ายที่สุดของทั้งฟีเจอร์
 * และเป็นจุดเดียวในเส้นทางเรียก AI ที่เทสได้โดยไม่ต้องมี API key:
 * โมเดลภาษาไม่ได้รับประกันว่าจะตอบเป็น JSON ที่ถูกรูปเสมอ มันอาจห่อด้วย
 * markdown fence พิมพ์คำอธิบายนำ หรือใส่ช่องไม่ครบ ถ้าเราปล่อยให้ JSON.parse
 * โยน error ขึ้นไปดิบ ๆ เด็กจะเห็นจอแดงแทนคำตอบของ Milo
 */

/** โมเดลตอบเป็น snake_case ตามที่ระบุใน system prompt */
const rawReplySchema = z.object({
  reply: z.string().min(1),
  reply_th: z.string().optional(),
  objective_met: z.boolean().optional(),
  words_used: z.array(z.string()).optional(),
  errors: z
    .array(
      z.object({
        type: z.string().optional(),
        child_said: z.string().optional(),
        correct: z.string().optional(),
      }),
    )
    .optional(),
  // โมเดลอาจตอบ null ตามภาษาพูดทั่วไปของ "ไม่มีธง" แทนคำว่า "none"
  safety_flag: safetyFlagSchema.nullish(),
  suggested_followups: z.array(z.string()).optional(),
});

/**
 * ดึงเฉพาะส่วนที่เป็น JSON ออกมาจากข้อความ
 *
 * รองรับทั้งกรณีตอบ JSON ล้วน ห่อด้วย ```json และมีข้อความนำหน้า
 * โดยตัดจากวงเล็บปีกกาแรกถึงปีกกาปิดสุดท้าย
 */
export function extractJsonObject(raw: string): string | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const body = fenced ? fenced[1] : raw;

  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  return body.slice(start, end + 1);
}

export type ParseResult =
  | { ok: true; reply: BuddyReply }
  | { ok: false; reason: "no_json" | "bad_json" | "bad_shape" };

export function parseBuddyReply(raw: string): ParseResult {
  const json = extractJsonObject(raw);
  if (json === null) return { ok: false, reason: "no_json" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, reason: "bad_json" };
  }

  const result = rawReplySchema.safeParse(parsed);
  if (!result.success) return { ok: false, reason: "bad_shape" };

  const raw_ = result.data;

  return {
    ok: true,
    reply: buddyReplySchema.parse({
      reply: raw_.reply.trim(),
      replyTh: raw_.reply_th?.trim() ?? "",
      objectiveMet: raw_.objective_met ?? false,
      wordsUsed: raw_.words_used ?? [],
      errors: (raw_.errors ?? [])
        // ทิ้งรายการที่ไม่ได้บอกว่าผิดตรงไหน เพราะเอาไปสอนต่อไม่ได้
        .filter((item) => item.child_said && item.correct)
        .map((item) => ({
          type: item.type ?? "unknown",
          childSaid: item.child_said ?? "",
          correct: item.correct ?? "",
        })),
      safetyFlag: raw_.safety_flag ?? "none",
      suggestedFollowups: (raw_.suggested_followups ?? []).slice(0, 3),
    }),
  };
}
