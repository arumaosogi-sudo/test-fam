import { z } from "zod";

/**
 * type กลางของทั้งแอป — ใช้ zod เพื่อให้ validate ข้อมูลที่มาจากไฟล์ JSON
 * และจาก localStorage ได้ด้วย ไม่ใช่แค่ประกาศ type ลอย ๆ
 *
 * ข้อมูลใน localStorage เชื่อไม่ได้ 100% (ผู้ใช้แก้เองได้ หรือเป็นของเวอร์ชันเก่า)
 * จึงต้อง parse ทุกครั้งที่อ่านเข้ามา
 */

export const cefrLevelSchema = z.enum([
  "Pre-A1",
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
]);
export type CefrLevel = z.infer<typeof cefrLevelSchema>;

export const partOfSpeechSchema = z.enum([
  "noun",
  "verb",
  "adjective",
  "number",
  "phrase",
]);
export type PartOfSpeech = z.infer<typeof partOfSpeechSchema>;

/**
 * 4 ทักษะที่วัดแยกกันต่อหนึ่งคำ — คำหนึ่งจะนับว่า "รู้จริง" ต้องผ่านหลายทาง
 * ไม่ใช่แค่จำหน้าตาคำได้ (ดู docs/PLAN.md หัวข้อ 4)
 */
export const skillSchema = z.enum(["recognize", "listen", "speak", "write"]);
export type Skill = z.infer<typeof skillSchema>;

/** โหมดเกม — P1 มีแค่ match ที่เหลือทยอยเพิ่มตาม docs/TASKS.md */
export const gameModeSchema = z.enum([
  "match",
  "cloze",
  "picture",
  "listen",
  "say",
  "build",
  "sort",
]);
export type GameMode = z.infer<typeof gameModeSchema>;

/** โหมดไหนฝึกทักษะอะไร ใช้ตอนอัปเดต mastery */
export const MODE_SKILL: Record<GameMode, Skill> = {
  match: "recognize",
  cloze: "write",
  picture: "recognize",
  listen: "listen",
  say: "speak",
  build: "write",
  sort: "recognize",
};

export const wordSchema = z.object({
  id: z.string().min(1),
  en: z.string().min(1),
  th: z.string().min(1),
  pos: partOfSpeechSchema,
  cefr: cefrLevelSchema,
  /** คำอ่านสากล ใช้โชว์ตอนสอนออกเสียง */
  ipa: z.string(),
  /** ภาพประกอบชั่วคราวเป็นอิโมจิ จะแทนที่ด้วยภาพจริงในภารกิจ T205 */
  emoji: z.string().min(1),
  unitId: z.string().min(1),
});
export type Word = z.infer<typeof wordSchema>;

export const unitSchema = z.object({
  id: z.string().min(1),
  cefr: cefrLevelSchema,
  order: z.number().int().nonnegative(),
  titleTh: z.string().min(1),
  titleEn: z.string().min(1),
  emoji: z.string().min(1),
});
export type Unit = z.infer<typeof unitSchema>;

export type Lesson = {
  id: string;
  unitId: string;
  /** ลำดับในหน่วย เริ่มที่ 1 */
  order: number;
  wordIds: string[];
  modes: GameMode[];
};

/** หนึ่ง item = หนึ่งหน้าจอที่เด็กต้องทำ */
export type MatchItem = {
  kind: "match";
  id: string;
  wordIds: string[];
};

export type Item = MatchItem;

export const attemptSchema = z.object({
  wordId: z.string(),
  skill: skillSchema,
  correct: z.boolean(),
  latencyMs: z.number().nonnegative(),
  at: z.string(),
});
export type Attempt = z.infer<typeof attemptSchema>;

/**
 * ผลการตอบที่ component ของเกมส่งออกมา — ยังไม่มีเวลาจริงติดมา
 *
 * ตั้งใจให้เกมไม่ต้องรู้เรื่องนาฬิกา เพราะการอ่านเวลาปัจจุบันระหว่าง render
 * เป็นผลข้างเคียงที่ทำให้ผลลัพธ์ไม่คงที่ ชั้น store เป็นคนประทับเวลาให้แทน
 */
export type AttemptDraft = Omit<Attempt, "at">;

export const srsStateSchema = z.enum([
  "new",
  "learning",
  "review",
  "relearning",
]);
export type SrsState = z.infer<typeof srsStateSchema>;

export const srsCardSchema = z.object({
  wordId: z.string(),
  /** ความคงทนของความจำ หน่วยเป็นวัน */
  stability: z.number().positive(),
  /** ความยากของคำนี้สำหรับเด็กคนนี้ 1–10 */
  difficulty: z.number().min(1).max(10),
  dueAt: z.string(),
  lastReviewedAt: z.string().nullable(),
  reps: z.number().int().nonnegative(),
  lapses: z.number().int().nonnegative(),
  state: srsStateSchema,
});
export type SrsCard = z.infer<typeof srsCardSchema>;

export const masterySchema = z.object({
  wordId: z.string(),
  recognize: z.number().int().min(0).max(5),
  listen: z.number().int().min(0).max(5),
  speak: z.number().int().min(0).max(5),
  write: z.number().int().min(0).max(5),
});
export type Mastery = z.infer<typeof masterySchema>;

export const profileSchema = z.object({
  displayName: z.string(),
  cefr: cefrLevelSchema,
  /** คะแนนความสามารถ ใช้เลือกความยากของข้อ */
  elo: z.number(),
  xp: z.number().int().nonnegative(),
  streakDays: z.number().int().nonnegative(),
  /** วันที่เล่นล่าสุดในรูปแบบ YYYY-MM-DD ตามเวลาท้องถิ่น */
  lastActiveDate: z.string().nullable(),
  /** ตั๋วกันไฟดับ ใช้อัตโนมัติเมื่อขาดไปหนึ่งวัน */
  streakFreezes: z.number().int().nonnegative(),
  dailyGoalMinutes: z.number().int().positive(),
  /** จำนวนข้อที่เคยทำ ใช้กำหนดค่า K ของ Elo */
  totalAttempts: z.number().int().nonnegative(),
});
export type Profile = z.infer<typeof profileSchema>;

export const lessonResultSchema = z.object({
  lessonId: z.string(),
  stars: z.number().int().min(0).max(3),
  bestAccuracy: z.number().min(0).max(1),
  completedAt: z.string(),
});
export type LessonResult = z.infer<typeof lessonResultSchema>;
