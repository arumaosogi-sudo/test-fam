import { z } from "zod";

/**
 * อ่านออกเสียงด้วย ElevenLabs — ผ่านเซิร์ฟเวอร์เท่านั้น
 *
 * คีย์ของ ElevenLabs ต้องไม่โผล่ในเบราว์เซอร์เด็ดขาด เหมือน GEMINI_API_KEY
 * ถ้าเรียกตรงจากฝั่งหน้าเว็บเพื่อความเร็ว คีย์จะถูกดูดไปใช้ภายในไม่กี่ชั่วโมง
 * และ ElevenLabs คิดเงินตามจำนวนตัวอักษร คนอื่นจะใช้โควตาเราหมดได้
 *
 * ยังไม่ตั้งคีย์ก็ไม่เป็นไร — ตอบ 503 แล้วฝั่งหน้าเว็บถอยไปใช้เสียงอื่นเอง
 */

/** Harry — Fierce Warrior (ผู้ใช้เลือกเอง) */
const VOICE_ID = "SOYHLrjzK2X1ezoPC6cr";
const MODEL_ID = "eleven_multilingual_v2";

/**
 * จำกัดความยาวเท่าข้อความแชท เพราะคิดเงินตามตัวอักษร
 * ถ้าไม่จำกัด ใครก็ส่งข้อความยาว ๆ มาเผาโควตาได้
 */
const requestSchema = z.object({
  text: z.string().min(1).max(500),
});

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
