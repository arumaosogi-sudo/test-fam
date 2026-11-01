import { z } from "zod";

import { getChatProvider } from "@/lib/chat";
import { redactionNotice, screenChildMessage } from "@/lib/chat/guardrails";
import { buildSystemPrompt } from "@/lib/chat/prompt";
import { chatTurnSchema } from "@/lib/chat/types";
import { cefrLevelSchema } from "@/lib/types";

/**
 * เส้นทางเดียวที่คุยกับผู้ให้บริการ AI
 *
 * API key ถูกอ่านที่นี่เท่านั้น ไม่เคยถูกส่งลงไปฝั่งเบราว์เซอร์
 * (ตัวแปรที่ไม่ขึ้นต้นด้วย NEXT_PUBLIC_ จะอยู่แต่ฝั่งเซิร์ฟเวอร์)
 * ถ้าหลุดไปอยู่ใน client component จะถูกดูดไปใช้ภายในไม่กี่ชั่วโมง
 */

const requestSchema = z.object({
  turns: z.array(chatTurnSchema).min(1).max(40),
  child: z.object({
    ageYears: z.number().int().min(3).max(15),
    cefr: cefrLevelSchema,
    targetWords: z.array(z.string()).max(10),
    topicTh: z.string().max(100),
  }),
});

/**
 * กันยิงถี่แบบหยาบ ๆ ด้วยหน่วยความจำของ process
 *
 * ข้อจำกัดที่ต้องรู้: ค่าหายทุกครั้งที่ deploy และถ้ารันหลาย instance
 * แต่ละตัวจะนับแยกกัน มันจึงกันได้แค่การยิงรัวจากเครื่องเดียว ไม่ใช่
 * การคุมต้นทุนจริง ของจริงต้องผูกกับบัญชีผู้ใช้ตอนภารกิจ E6
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 15;
const hits = new Map<string, number[]>();

function rateLimited(key: string, now: number): boolean {
  const recent = (hits.get(key) ?? []).filter(
    (stamp) => now - stamp < WINDOW_MS,
  );

  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }

  recent.push(now);
  hits.set(key, recent);
  return false;
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}

export async function POST(request: Request) {
  const provider = getChatProvider();

  if (!provider.isConfigured()) {
    return Response.json(
      {
        error: "not_configured",
        messageTh:
          "ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY — คัดลอก .env.local.example เป็น .env.local แล้วใส่ key",
      },
      { status: 503 },
    );
  }

  if (rateLimited(clientKey(request), Date.now())) {
    return Response.json(
      {
        error: "rate_limited",
        messageTh: "คุยเร็วไปหน่อย รอสักครู่แล้วลองใหม่นะ",
      },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  // กรองข้อมูลส่วนตัวออกจากทุกเทิร์นของเด็กก่อนส่งออกนอกเครื่อง
  const found: string[] = [];
  const turns = parsed.data.turns.map((turn) => {
    if (turn.role !== "child") return turn;
    const screened = screenChildMessage(turn.text);
    found.push(...screened.found);
    return { ...turn, text: screened.text };
  });

  try {
    const reply = await provider.reply({
      system: buildSystemPrompt(parsed.data.child),
      turns,
    });

    return Response.json({
      reply,
      noticeTh: redactionNotice(
        found as Parameters<typeof redactionNotice>[0],
      ),
    });
  } catch (error) {
    // ไม่ส่งรายละเอียด error กลับไปฝั่งเบราว์เซอร์ เพราะอาจมีข้อมูลของระบบปนมา
    console.error("[chat] เรียกผู้ให้บริการ AI ไม่สำเร็จ:", error);

    return Response.json(
      {
        error: "provider_failed",
        messageTh: "Milo ไม่ว่างพอดี ลองใหม่อีกครั้งนะ",
      },
      { status: 502 },
    );
  }
}
