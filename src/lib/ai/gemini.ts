import { z } from "zod";

import { chatTurnSchema } from "@/lib/chat/types";

import { toGeminiSchema } from "./json-schema";
import {
  ChatProviderError,
  type ChatProvider,
  type ChatProviderRequest,
  type ChatProviderResult,
} from "./types";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * รุ่นหลักกับรุ่นสำรอง — วัดจริงบนโควตาฟรีเมื่อ 1 พ.ย. 2026
 *
 *   gemini-3.1-flash-lite  ~1.0–1.3 วิ  ตอบ 200 ทุกครั้ง   <- รุ่นหลัก
 *   gemini-3.5-flash       ~2.8–3.9 วิ  ตอบ 200 ทุกครั้ง   <- รุ่นสำรอง เก่งกว่าแต่ช้ากว่า
 *   gemini-3.8-flash       12–118 วิ    503 บ่อย           <- ใหม่สุดแต่ใช้กับเด็กไม่ได้
 *
 * เลือกตัวเร็วเป็นหลักเพราะเด็กอนุบาลรอ 4 วินาทีไม่ไหว บทสนทนาจะตายก่อน
 * แต่ถ้าตัวหลักล่มหรือตอบผิดรูปแบบ ให้ถอยไปตัวที่ฉลาดกว่าแทนการขึ้น error
 */
export const PRIMARY_MODEL = "gemini-3.1-flash-lite";
export const FALLBACK_MODEL = "gemini-3.5-flash";

/** เด็กรอได้ประมาณนี้ ถ้าเกินนี้ถือว่าล่มแล้วไปใช้รุ่นสำรอง */
const TIMEOUT_MS = 12_000;

/** schema ที่ส่งให้โมเดล สร้างจาก zod ตัวเดียวกับที่ใช้ตรวจคำตอบขากลับ */
export const geminiResponseSchema = toGeminiSchema(
  z.toJSONSchema(chatTurnSchema) as Record<string, unknown>,
);

type GeminiCandidate = {
  content?: { parts?: { text?: string }[] };
};

function buildBody(request: ChatProviderRequest) {
  return {
    systemInstruction: { parts: [{ text: request.systemPrompt }] },
    contents: [
      ...request.history.map((message) => ({
        // Gemini รู้จักแค่ user กับ model — เด็กคือ user ส่วน Milo คือ model
        role: message.role === "child" ? "user" : "model",
        parts: [{ text: message.text }],
      })),
      { role: "user", parts: [{ text: request.message }] },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: geminiResponseSchema,
      // ปิดการคิดก่อนตอบ บทสนทนาเด็กสั้นและง่าย ไม่คุ้มกับเวลาที่เสียไป
      thinkingConfig: { thinkingBudget: 0 },
      temperature: 0.8,
      maxOutputTokens: 800,
    },
    safetySettings: [
      "HARM_CATEGORY_HARASSMENT",
      "HARM_CATEGORY_HATE_SPEECH",
      "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      "HARM_CATEGORY_DANGEROUS_CONTENT",
    ].map((category) => ({ category, threshold: "BLOCK_MEDIUM_AND_ABOVE" })),
  };
}

class GeminiChatProvider implements ChatProvider {
  readonly id = "gemini";

  isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  private async callModel(
    model: string,
    request: ChatProviderRequest,
  ): Promise<ChatProviderResult> {
    const response = await fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
      },
      body: JSON.stringify(buildBody(request)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new ChatProviderError(
        `${model} ตอบกลับ ${response.status}`,
        "unavailable",
      );
    }

    const payload = (await response.json()) as {
      candidates?: GeminiCandidate[];
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      // เกิดได้เมื่อ safety filter ของ Gemini บล็อกคำตอบทิ้ง
      throw new ChatProviderError(`${model} ไม่ส่งข้อความกลับมา`, "bad_response");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new ChatProviderError(`${model} ส่ง JSON ที่อ่านไม่ออก`, "bad_response");
    }

    const turn = chatTurnSchema.safeParse(parsed);
    if (!turn.success) {
      throw new ChatProviderError(
        `${model} ส่งข้อมูลไม่ตรง schema`,
        "bad_response",
      );
    }

    return { turn: turn.data, model };
  }

  async respond(request: ChatProviderRequest): Promise<ChatProviderResult> {
    if (!this.isConfigured()) {
      throw new ChatProviderError("ยังไม่ได้ตั้งค่า GEMINI_API_KEY", "not_configured");
    }

    try {
      return await this.callModel(PRIMARY_MODEL, request);
    } catch (error) {
      // รุ่นหลักล่ม ตอบช้าเกิน หรือส่งรูปแบบผิด — ลองรุ่นที่ฉลาดกว่าอีกครั้งเดียว
      if (error instanceof ChatProviderError && error.kind === "not_configured") {
        throw error;
      }
      return await this.callModel(FALLBACK_MODEL, request);
    }
  }
}

export const geminiChat: ChatProvider = new GeminiChatProvider();
