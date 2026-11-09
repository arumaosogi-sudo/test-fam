import { z } from "zod";

import { spendTurn, type TurnBudget } from "@/lib/chat/guardrail";
import { localDateKey } from "@/lib/progress/xp";

/**
 * อ่านออกเสียงด้วย ElevenLabs — ผ่านเซิร์ฟเวอร์เท่านั้น
 *
 * คีย์ของ ElevenLabs ต้องไม่โผล่ในเบราว์เซอร์เด็ดขาด เหมือน GEMINI_API_KEY
 * ถ้าเรียกตรงจากฝั่งหน้าเว็บเพื่อความเร็ว คีย์จะถูกดูดไปใช้ภายในไม่กี่ชั่วโมง
 * และ ElevenLabs คิดเงินตามจำนวนตัวอักษร คนอื่นจะใช้โควตาเราหมดได้
 *
 * ยังไม่ตั้งคีย์ก็ไม่เป็นไร — ตอบ 503 แล้วฝั่งหน้าเว็บถอยไปใช้เสียงอื่นเอง
 */

/**
 * เสียงที่ผู้ใช้เลือกจากคลังเสียงของ ElevenLabs
 *
 * เปลี่ยนเสียงแก้ที่บรรทัดเดียวนี้ รหัสเอามาจาก URL หรือหน้า Voices
 * ของ elevenlabs.io — เคยใช้ SOYHLrjzK2X1ezoPC6cr (Harry) มาก่อน
 */
const VOICE_ID = "SX2xBM4KMJnkgx6wnt4M";
const MODEL_ID = "eleven_multilingual_v2";

/**
 * จำกัดความยาวเท่าข้อความแชท เพราะคิดเงินตามตัวอักษร
 * ถ้าไม่จำกัด ใครก็ส่งข้อความยาว ๆ มาเผาโควตาได้
 */
const requestSchema = z.object({
  text: z.string().min(1).max(500),
});

/**
 * โควตาต่อเครื่องต่อวัน — เหมือน route ของแชท
 *
 * ElevenLabs คิดเงินตามจำนวนตัวอักษร ถ้าไม่จำกัด ใครที่เข้าถึงเซิร์ฟเวอร์ได้
 * ก็ยิงรัวจนโควตาของเจ้าของแอปหมดภายในไม่กี่นาที จำเป็นมากตอนเอาขึ้นออนไลน์
 * ให้คนอื่นลอง ซึ่งเป็นสิ่งที่ยังขาดอยู่ตอนต่อเสียงครั้งแรก
 *
 * ตั้งสูงกว่าโควตาแชท เพราะหนึ่งเทิร์นแชทเด็กกดฟังซ้ำได้หลายครั้ง
 * และคำทักทายที่แอปสร้างเองก็กินโควตานี้ด้วยโดยไม่ได้เรียกโมเดลเลย
 *
 * เก็บในหน่วยความจำของโปรเซส หายเมื่อรีสตาร์ตและแยกกันคนละอินสแตนซ์
 * รับได้ในเฟสเดโม พอถึง E6 ต้องย้ายไปนับในฐานข้อมูลต่อผู้ใช้จริง
 */
const DAILY_SPEAK_LIMIT = 120;
const budgets = new Map<string, TurnBudget>();

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}

export async function POST(request: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return Response.json(
      { error: "not_configured", message: "ยังไม่ได้ตั้งค่า ELEVENLABS_API_KEY" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "bad_request", message: "ส่งข้อมูลมาไม่ถูกรูปแบบ" },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "bad_request", message: "ข้อความว่างหรือยาวเกินไป" },
      { status: 400 },
    );
  }

  // นับโควตา **ก่อน** ยิงไปปลายทาง ไม่งั้นก็จ่ายเงินไปแล้วถึงค่อยปฏิเสธ
  const clientId = clientKey(request);
  const spent = spendTurn(
    budgets.get(clientId),
    localDateKey(new Date()),
    DAILY_SPEAK_LIMIT,
  );
  budgets.set(clientId, spent.budget);

  if (!spent.allowed) {
    return Response.json(
      { error: "daily_limit", message: "วันนี้ฟังเสียงครบแล้ว พรุ่งนี้มาฟังใหม่นะ" },
      { status: 429 },
    );
  }

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": key,
          "content-type": "application/json",
          accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: parsed.data.text,
          model_id: MODEL_ID,
        }),
      },
    );

    if (!upstream.ok) {
      /*
       * ไม่ส่งข้อความของผู้ให้บริการต่อไปให้เบราว์เซอร์ เพราะมีรายละเอียด
       * บัญชีติดมา แต่ต้องพิมพ์ลง log ของเซิร์ฟเวอร์ ไม่งั้นปัญหาการตั้งค่า
       * จะกลายเป็น "เสียงไม่ออก" เฉย ๆ โดยไม่มีใครรู้สาเหตุ
       *
       * เจอจริงตอนต่อครั้งแรก: คีย์ถูกต้องแต่ไม่มีสิทธิ์ text_to_speech
       * ซึ่งมองจากหน้าเว็บแล้วเหมือนเสียงพังเฉย ๆ
       */
      const detail = await upstream.text().catch(() => "");
      console.error(
        `[tts] ElevenLabs ตอบ ${upstream.status}: ${detail.slice(0, 300)}`,
      );

      return Response.json(
        { error: "upstream", message: "ตอนนี้อ่านออกเสียงไม่ได้" },
        { status: 502 },
      );
    }

    return new Response(upstream.body, {
      headers: {
        "content-type": "audio/mpeg",
        // ประโยคเดิมไม่ต้องจ่ายซ้ำ ให้เบราว์เซอร์เก็บไว้หนึ่งวัน
        "cache-control": "private, max-age=86400",
      },
    });
  } catch {
    return Response.json(
      { error: "upstream", message: "ตอนนี้อ่านออกเสียงไม่ได้" },
      { status: 502 },
    );
  }
}

/** ให้หน้าเว็บถามได้ว่าตั้งคีย์ไว้หรือยัง โดยไม่ต้องลองอ่านจริง */
export function GET() {
  return Response.json({ configured: Boolean(process.env.ELEVENLABS_API_KEY) });
}
