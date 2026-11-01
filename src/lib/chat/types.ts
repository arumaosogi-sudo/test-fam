import { z } from "zod";

import type { CefrLevel } from "@/lib/types";

/**
 * สัญญากลางของ AI Chat Buddy (ตามแนวคิดเดียวกับ ADR-0003 ของบริการเสียง)
 *
 * เหตุผลที่แยก interface ไว้ตั้งแต่ต้น: เรายังไม่ได้ทดสอบว่าเจ้าไหนคุมเพดาน
 * คำศัพท์ตาม CEFR ได้แม่นกว่ากัน ซึ่งเป็นหัวใจของแอปสอนภาษาเด็ก การผูกโค้ด
 * ไว้กับผู้ให้บริการเจ้าเดียวตั้งแต่ยังไม่รู้ผล แปลว่าถ้าผลออกมาไม่ดีต้องรื้อ
 * ทั้งหน้าแชท ชั้นนี้ทำให้การสลับเจ้าเหลือแค่แก้ไฟล์ index.ts ไฟล์เดียว
 */

export const chatRoleSchema = z.enum(["child", "buddy"]);
export type ChatRole = z.infer<typeof chatRoleSchema>;

export const chatTurnSchema = z.object({
  role: chatRoleSchema,
  /** ข้อความภาษาอังกฤษที่แสดงบนจอ */
  text: z.string(),
});
export type ChatTurn = z.infer<typeof chatTurnSchema>;

/** ธงความปลอดภัย — `concerning` คือกรณีที่ผู้ใหญ่ต้องรู้ ไม่ใช่แค่กรองคำ */
export const safetyFlagSchema = z.enum([
  "none",
  /** เด็กเผลอเล่าข้อมูลส่วนตัว */
  "personal_info",
  /** เด็กเล่าเรื่องที่น่าเป็นห่วง เช่น ถูกทำร้าย หรือทำร้ายตัวเอง */
  "concerning",
  /** คุยออกนอกเรื่องจนไม่ได้ฝึกภาษา */
  "off_topic",
]);
export type SafetyFlag = z.infer<typeof safetyFlagSchema>;

export const languageErrorSchema = z.object({
  /** ชนิดของข้อผิดพลาด เช่น plural_s, verb_tense — ใช้จับแพตเทิร์นที่ผิดซ้ำ */
  type: z.string(),
  childSaid: z.string(),
  correct: z.string(),
});
export type LanguageError = z.infer<typeof languageErrorSchema>;

/**
 * สิ่งที่ AI ต้องตอบกลับมาทุกเทิร์น ไม่ใช่แค่ข้อความ
 *
 * ข้อมูลส่วนที่เด็กไม่เห็น (คำที่ใช้ไป ข้อผิดพลาด ธงความปลอดภัย) คือสิ่งที่
 * ทำให้แชทป้อนกลับเข้าเอนจินการเรียนได้ ไม่ใช่แค่คุยเล่นแล้วจบไป
 */
export const buddyReplySchema = z.object({
  /** คำตอบภาษาอังกฤษ 1–2 ประโยค แล้วตามด้วยคำถามกลับ */
  reply: z.string().min(1),
  /** คำแปลไทยของคำตอบ ใช้กับปุ่ม "แปลเป็นไทย" */
  replyTh: z.string().default(""),
  /** เด็กทำสำเร็จตามเป้าของบทสนทนานี้หรือยัง */
  objectiveMet: z.boolean().default(false),
  /** คำเป้าหมายที่เด็กใช้ได้ถูกต้อง ใช้ให้ XP และป้อนกลับเข้า SRS */
  wordsUsed: z.array(z.string()).default([]),
  errors: z.array(languageErrorSchema).default([]),
  safetyFlag: safetyFlagSchema.default("none"),
  /** ตัวช่วยสำหรับเด็กที่ยังตอบเองไม่ได้ กดเลือกแล้วส่งได้เลย */
  suggestedFollowups: z.array(z.string()).max(3).default([]),
});
export type BuddyReply = z.infer<typeof buddyReplySchema>;

export type ChatRequest = {
  system: string;
  turns: ChatTurn[];
};

export interface ChatProvider {
  readonly id: string;
  /** มี API key ครบและพร้อมเรียกจริงหรือยัง */
  isConfigured(): boolean;
  reply(request: ChatRequest): Promise<BuddyReply>;
}

/** บริบทของเด็กที่ใช้ประกอบ system prompt */
export type ChildContext = {
  ageYears: number;
  cefr: CefrLevel;
  /** คำที่อยากให้เด็กได้ใช้ในบทสนทนานี้ */
  targetWords: string[];
  topicTh: string;
};
