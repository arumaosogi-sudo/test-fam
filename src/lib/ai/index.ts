import { geminiChat } from "./gemini";
import type { ChatProvider } from "./types";

/**
 * จุดเดียวที่เลือกผู้ให้บริการโมเดลภาษา — เปลี่ยนเจ้าแก้แค่ไฟล์นี้
 *
 * ตอนนี้ใช้ Gemini เพราะมีโควตาฟรี (ดู docs/adr/0006-llm-provider.md)
 */
export function getChatProvider(): ChatProvider {
  return geminiChat;
}

export * from "./types";
