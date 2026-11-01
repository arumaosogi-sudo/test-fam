import { z } from "zod";

import { cefrLevelSchema } from "@/lib/types";

/**
 * สัญญาของคำตอบหนึ่งเทิร์นจากเพื่อน AI
 *
 * ทุกเทิร์นต้องส่งข้อมูลกลับมามากกว่าข้อความที่เด็กเห็น เพราะแชทในแอปนี้
 * ไม่ใช่ของเล่นแยกส่วน — คำที่เด็กใช้ได้จริงและที่ใช้ผิดต้องไหลกลับเข้า
 * ตารางทบทวนและรายงานครู (ดู docs/PLAN.md หัวข้อ 10)
 *
 * schema เดียวกันนี้ถูกแปลงเป็น JSON Schema ส่งให้โมเดลด้วย (ดู geminiResponseSchema)
 * ทั้งสองฝั่งจึงไม่มีทางหลุดจากกัน
 */

export const safetyFlagSchema = z.enum([
  "none",
  /** เด็กบอกชื่อจริง ที่อยู่ โรงเรียน เบอร์โทร */
  "personal_info",
  /** เด็กเล่าเรื่องที่ผู้ใหญ่ควรรู้ เช่น ถูกทำร้าย หรือทำร้ายตัวเอง */
  "concerning",
  /** คุยออกนอกเรื่องที่ไม่เหมาะกับเด็ก */
  "off_topic",
]);
export type SafetyFlag = z.infer<typeof safetyFlagSchema>;

export const chatMistakeSchema = z.object({
  /** ชนิดของข้อผิดพลาด เช่น plural_s, verb_tense, word_order */
  type: z.string(),
  childSaid: z.string(),
  correct: z.string(),
  /** อธิบายเป็นไทยสั้น ๆ ให้เด็กกับผู้ปกครองอ่านเข้าใจ */
  whyTh: z.string(),
});
export type ChatMistake = z.infer<typeof chatMistakeSchema>;

export const chatTurnSchema = z.object({
  /** ข้อความภาษาอังกฤษที่เด็กเห็นและได้ยิน */
  reply: z.string().min(1),
  /** คำแปลไทยของ reply ใช้กับปุ่ม "แปลเป็นไทย" */
  replyTh: z.string(),
  /** คำจากคลังคำที่เด็กใช้ถูกต้องในเทิร์นนี้ ป้อนกลับเข้าตารางทบทวน */
  wordsUsed: z.array(z.string()),
  /** ที่เด็กใช้ผิด — AI ไม่ดุในข้อความ แต่บันทึกไว้ให้ระบบกับครูเห็น */
  mistakes: z.array(chatMistakeSchema),
  /** เด็กทำเป้าหมายของบทสนทนานี้สำเร็จหรือยัง */
  objectiveMet: z.boolean(),
  safetyFlag: safetyFlagSchema,
  /** 3 ประโยคสั้นที่เด็กกดส่งต่อได้ทันที กันบทสนทนาตายเพราะเด็กนึกไม่ออก */
  suggestedReplies: z.array(z.string()),
});
export type ChatTurn = z.infer<typeof chatTurnSchema>;

/** ข้อความหนึ่งบรรทัดในหน้าแชท */
export type ChatMessage = {
  id: string;
  role: "child" | "milo";
  text: string;
  textTh?: string;
  mistakes?: ChatMistake[];
};

export const chatRequestSchema = z.object({
  /** บทสนทนาก่อนหน้า ไม่รวมข้อความล่าสุด */
  history: z
    .array(
      z.object({
        role: z.enum(["child", "milo"]),
        text: z.string().min(1).max(500),
      }),
    )
    .max(40),
  /** ข้อความล่าสุดที่เด็กพิมพ์ */
  message: z.string().min(1).max(500),
  cefr: cefrLevelSchema,
  /** หน่วยคำศัพท์ที่เป็นเป้าหมายของบทสนทนานี้ */
  unitId: z.string().min(1),
  childName: z.string().max(40).optional(),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;
