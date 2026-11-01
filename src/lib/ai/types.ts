import type { ChatTurn } from "@/lib/chat/types";

/**
 * สัญญากลางของผู้ให้บริการโมเดลภาษา (หลักการเดียวกับ ADR-0003 ของบริการเสียง)
 *
 * เหตุผลที่แยก interface ไว้: เราเปลี่ยนจาก Claude มา Gemini ตั้งแต่ยังไม่ได้
 * เขียนโค้ดเลย และคงเปลี่ยนอีกเมื่อราคาหรือโควตาเปลี่ยน ถ้าโค้ดแชทเรียก
 * HTTP ของเจ้าใดเจ้าหนึ่งตรง ๆ การย้ายครั้งหน้าจะต้องรื้อทั้งฟีเจอร์
 */

export type ChatProviderRequest = {
  systemPrompt: string;
  history: { role: "child" | "milo"; text: string }[];
  message: string;
};

export type ChatProviderResult = {
  turn: ChatTurn;
  /** รุ่นที่ตอบจริง — อาจไม่ใช่รุ่นหลักถ้าสลับไปตัวสำรอง */
  model: string;
};

export interface ChatProvider {
  readonly id: string;
  /** มี key ครบและพร้อมเรียกหรือยัง */
  isConfigured(): boolean;
  respond(request: ChatProviderRequest): Promise<ChatProviderResult>;
}

/** ผู้ให้บริการตอบไม่ได้ — แยกชนิดไว้เพื่อให้ API route เลือกข้อความที่เหมาะกับเด็ก */
export class ChatProviderError extends Error {
  constructor(
    message: string,
    readonly kind: "not_configured" | "unavailable" | "bad_response",
  ) {
    super(message);
    this.name = "ChatProviderError";
  }
}
