import { anthropicChat } from "./anthropic";
import type { ChatProvider } from "./types";

/**
 * จุดเดียวที่เลือกผู้ให้บริการ AI — เวลาย้ายไป Gemini หรือเจ้าอื่น แก้ที่นี่
 *
 * ยังไม่ได้ทดสอบว่าเจ้าไหนคุมเพดานคำศัพท์ตาม CEFR ได้แม่นกว่ากัน ซึ่งเป็น
 * เกณฑ์ตัดสินจริงของแอปนี้ ไฟล์นี้จึงมีไว้ให้สลับได้โดยไม่ต้องแตะหน้าแชท
 * (ดู ADR-0006)
 */
export function getChatProvider(): ChatProvider {
  return anthropicChat;
}

export * from "./types";
