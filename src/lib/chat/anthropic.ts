import Anthropic from "@anthropic-ai/sdk";

import { parseBuddyReply } from "./parse";
import type { BuddyReply, ChatProvider, ChatRequest } from "./types";

/**
 * ผู้ให้บริการ AI ตัวจริง — Claude
 *
 * ใช้ Haiku เพราะแชทกับเด็กเป็นงานที่ต้องตอบไว ประโยคสั้น และเรียกบ่อย
 * ซึ่งเป็นโจทย์ที่โมเดลเล็กทำได้ดีในราคาที่ถูกกว่ามาก (ดู docs/PLAN.md 9.3)
 * ถ้าทดสอบแล้วพบว่าคุมเพดานคำศัพท์ตาม CEFR ได้ไม่แม่นพอ ค่อยขยับขึ้น Sonnet
 * โดยแก้ที่ค่าคงที่ข้างล่างนี้ที่เดียว
 *
 * ⚠️ เส้นทางนี้ยังไม่เคยถูกยิงจริง เพราะยังไม่มี ANTHROPIC_API_KEY
 * ส่วนที่เทสแล้วคือการประกอบ prompt และการแกะ JSON ที่ตอบกลับมา (ดู parse.ts)
 */

const MODEL = "claude-haiku-5-5";

/** คำตอบของ Milo สั้นอยู่แล้ว เพดานนี้กันกรณีโมเดลหลุดไปเขียนยาว */
const MAX_TOKENS = 600;

class AnthropicChatProvider implements ChatProvider {
  readonly id = "anthropic";

  isConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  async reply(request: ChatRequest): Promise<BuddyReply> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY");

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: "text",
          text: request.system,
          // system prompt เดิมทุกเทิร์นในบทสนทนาเดียวกัน แคชไว้ลดทั้งเวลาและเงิน
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: request.turns.map((turn) => ({
        role: turn.role === "child" ? ("user" as const) : ("assistant" as const),
        content: turn.text,
      })),
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const parsed = parseBuddyReply(text);
    if (!parsed.ok) {
      throw new Error(`คำตอบจาก AI ผิดรูปแบบ (${parsed.reason})`);
    }

    return parsed.reply;
  }
}

export const anthropicChat: ChatProvider = new AnthropicChatProvider();
