import { ChatProviderError, getChatProvider } from "@/lib/ai";
import {
  mergeSafetyFlags,
  redactionNotice,
  screenChildMessage,
  spendTurn,
  type TurnBudget,
} from "@/lib/chat/guardrail";
import { buildSystemPrompt, recentQuestionsFrom } from "@/lib/chat/prompt";
import { getTopic, topicWords } from "@/lib/chat/topics";
import { chatRequestSchema } from "@/lib/chat/types";
import { localDateKey } from "@/lib/progress/xp";

/**
 * เทิร์นเดียวของการคุยกับเพื่อน AI
 *
 * ทุกอย่างที่แตะ GEMINI_API_KEY อยู่ฝั่งนี้เท่านั้น หน้าเว็บเรียกผ่าน fetch
 * ไม่มีทางที่ key จะไปโผล่ในเบราว์เซอร์ (ถ้าย้ายไปเรียกตรงจากฝั่ง client
 * เพื่อความเร็ว key จะถูกดูดไปใช้ภายในไม่กี่ชั่วโมง)
 */

/**
 * โควตาต่อเครื่อง เก็บในหน่วยความจำของโปรเซส
 *
 * หายเมื่อเซิร์ฟเวอร์รีสตาร์ต และแยกกันคนละอินสแตนซ์ — รับได้ในเฟสเดโม
 * ที่ยังไม่มีบัญชีผู้ใช้ พอถึง E6 ต้องย้ายไปนับในฐานข้อมูลต่อผู้ใช้จริง
 */
const budgets = new Map<string, TurnBudget>();

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}

function fail(status: number, message: string, code: string) {
  return Response.json({ error: code, message }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "ส่งข้อมูลมาไม่ถูกรูปแบบ", "bad_request");
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail(400, "ข้อความยาวเกินไปหรือข้อมูลไม่ครบ", "bad_request");
  }

  const { history, message, cefr, topicId, childName } = parsed.data;

  const topic = getTopic(topicId);
  if (!topic) return fail(400, "ไม่พบหัวข้อที่เลือก", "unknown_topic");

  const key = clientKey(request);
  const today = localDateKey(new Date());
  const spent = spendTurn(budgets.get(key), today);
  budgets.set(key, spent.budget);

  if (!spent.allowed) {
    return fail(
      429,
      "วันนี้คุยกับ Milo ครบแล้ว พรุ่งนี้มาคุยกันใหม่นะ",
      "daily_limit",
    );
  }

  // ตัดข้อมูลระบุตัวตนออก "ก่อน" ส่งออกนอกเครื่อง ส่งไปแล้วเอากลับไม่ได้
  const screened = screenChildMessage(message);
  if (screened.text.length === 0) {
    return fail(400, "พิมพ์อย่างอื่นคุยกับ Milo ได้เลยนะ", "empty_after_redaction");
  }

  const provider = getChatProvider();

  try {
    const { turn, model } = await provider.respond({
      systemPrompt: buildSystemPrompt({
        cefr,
        topic,
        // กรองตามระดับเด็กตรงนี้ ไม่ใช่ฝากความหวังไว้กับ prompt อย่างเดียว
        targetWords: topicWords(topic.id, cefr),
        childName,
        // เอาคำถามเก่าของ Milo กลับเข้าไปห้ามถามซ้ำ โมเดลไม่ได้จำเอง
        recentQuestions: recentQuestionsFrom(history),
      }),
      history,
      message: screened.text,
    });

    // ธงของเราเองชนะถ้าร้ายแรงกว่าที่โมเดลตอบมา
    const safetyFlag = mergeSafetyFlags(
      turn.safetyFlag,
      screened.found.length > 0 ? "personal_info" : "none",
    );

    return Response.json({
      turn: { ...turn, safetyFlag },
      notice: redactionNotice(screened.found),
      remaining: spent.remaining,
      model,
    });
  } catch (error) {
    if (error instanceof ChatProviderError && error.kind === "not_configured") {
      return fail(
        503,
        // ข้อความนี้เด็กไม่เห็น แต่คนดูแลเห็น จึงต้องไม่ชี้ไปผิดที่
        // เดิมเขียนว่า "ในไฟล์ .env.local" ซึ่งบนโฮสต์จริงไม่มีไฟล์นั้น
        "ยังไม่ได้ตั้งค่า GEMINI_API_KEY — ใส่ใน .env.local ถ้ารันในเครื่อง หรือในหน้า Environment Variables ของโฮสต์",
        "not_configured",
      );
    }

    // ข้อความนี้เด็กเห็น จึงต้องไม่ใช่ศัพท์เทคนิคและไม่โทษเด็ก
    return fail(
      502,
      "ตอนนี้ Milo ยังไม่ตอบ ลองพิมพ์ใหม่อีกครั้งนะ",
      "provider_unavailable",
    );
  }
}
