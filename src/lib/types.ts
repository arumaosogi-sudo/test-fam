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

/**
 * ระดับเรียงจากต้นไปปลาย — อ่านจาก schema ตัวเดียวกัน ไม่ประกาศซ้ำ
 * เพราะลำดับนี้ใช้ตัดสินว่าระดับไหน "สูงกว่า" ระดับไหน ถ้ามีสองชุดแล้วหลุดจากกัน
 * บันไดระดับทั้งแอปจะเพี้ยนโดยไม่มีอะไรฟ้อง
 */
export const CEFR_ORDER = cefrLevelSchema.options;

export const partOfSpeechSchema = z.enum([
  "noun",
  "pronoun",
  "verb",
  "adjective",
  "adverb",
  "preposition",
  /** คำบ่งชี้ปริมาณอย่าง some / many / every */
  "determiner",
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

/**
 * โหมดไหนฝึกทักษะอะไรอยู่ใน `lib/games/skills.ts` ไม่ใช่ตารางคงที่ในไฟล์นี้
 * เพราะโหมดเดียวกันฝึกคนละทักษะได้ ขึ้นกับโหมดย่อยที่เด็กได้เล่น
 */

/** ตัวแทนช่องว่างในประโยคตัวอย่าง */
export const BLANK = "{}";

export const wordSchema = z.object({
  id: z.string().min(1),
  en: z.string().min(1),
  th: z.string().min(1),
  /**
   * คำแปลไทยนี้มีอะไรรองรับ (ดู docs/thai-review.md)
   *
   * wiktionary = ปรากฏใน Wiktionary ตรงตัว
   * adapted    = ต่างจากพจนานุกรมโดยตั้งใจ มีเหตุผลกำกับไว้ในเอกสาร
   * unverified = ยังไม่มีอะไรรองรับ ห้ามปล่อยถึงเด็กโดยไม่มีคนตรวจก่อน
   *
   * บังคับให้ทุกคำต้องระบุ เพราะคำแปลผิดในสื่อสอนเด็กคือความเสียหายจริง
   * และ "ลืมตรวจ" ต้องแยกออกจาก "ตรวจแล้ว" ให้ได้ในข้อมูล ไม่ใช่ในความทรงจำ
   */
  thSource: z.enum(["wiktionary", "adapted", "unverified"]),
  pos: partOfSpeechSchema,
  cefr: cefrLevelSchema,
  /**
   * ที่มาของคำอ่าน หลักการเดียวกับ thSource (ดู docs/ipa-review.md)
   * wiktionary = ดึงจาก Wiktionary · unverified = พจนานุกรมไม่มี ต้องให้คนตรวจ
   */
  ipaSource: z.enum(["wiktionary", "unverified"]),
  /**
   * คำอ่านสากล ใช้โชว์ตอนสอนออกเสียง
   *
   * ใช้สำเนียง General American ให้ตรงกับเสียงอ่านในแอปที่ตั้งเป็น en-US
   * ถ้าปนสำเนียง เด็กจะเห็นสัญลักษณ์อย่างหนึ่งแต่ได้ยินอีกอย่างหนึ่ง
   */
  ipa: z.string(),
  /**
   * ประโยคตัวอย่างที่มีช่องว่าง `{}` อยู่ตำแหน่งของคำนี้ ใช้ในเกมเติมคำ
   *
   * บังคับว่าต้องมีช่องว่างพอดีหนึ่งช่อง เพราะถ้าไม่มีเลยเกมจะไม่มีอะไรให้เติม
   * และถ้ามีสองช่องจะไม่รู้ว่าคำตอบควรลงช่องไหน — ทั้งสองกรณีควรพังตอน build
   * ไม่ใช่ตอนเด็กเล่นอยู่
   */
  sentence: z
    .string()
    .min(1)
    .refine((value) => value.split(BLANK).length === 2, {
      message: `ประโยคตัวอย่างต้องมีช่องว่าง ${BLANK} พอดีหนึ่งช่อง`,
    })
    .optional(),
  /**
   * อิโมจิต้นทางของภาพ เก็บไว้อ้างอิงว่าภาพในโปรเจกต์มาจากตัวไหน
   * คำที่วาดเป็นภาพไม่ได้จะไม่มีค่านี้ และไม่ได้ใช้แสดงผลที่ไหนแล้ว
   */
  emoji: z.string().min(1).optional(),
  /**
   * มีไฟล์ภาพใน public/words/<id>.svg หรือไม่
   *
   * คำรูปธรรมวาดเป็นภาพได้ แต่คำอย่าง think หรือ important วาดไม่ได้
   * คำที่ไม่มีภาพจะข้ามโหมดดูภาพ และโหมดฟังจะโชว์เฉพาะคำแปลไทย
   * ไม่ใช่ปล่อยให้เป็นรูปแตกบนจอเด็ก
   */
  image: z.boolean(),
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

/**
 * ระดับความช่วยเหลือของเกมเติมคำ ไล่จากง่ายไปยาก (ดู docs/PLAN.md โหมด G2)
 *
 * bank  = เลือกจากคำ 3 ตัว — อนุบาลที่ยังสะกดไม่ได้
 * tiles = ต่อตัวอักษรที่ให้มา — ประถมต้น
 * type  = พิมพ์เอง ตรวจแบบใจดี — ประถมปลาย
 */
export const clozeLevelSchema = z.enum(["bank", "tiles", "type"]);
export type ClozeLevel = z.infer<typeof clozeLevelSchema>;

/** โหมดย่อยของเกมดูภาพ — `say` (พูดชื่อภาพ) ต้องรอ STT ในเฟส P3 */
export const pictureVariantSchema = z.enum(["choose", "spell"]);
export type PictureVariant = z.infer<typeof pictureVariantSchema>;

/**
 * หนึ่ง item = หนึ่งหน้าจอที่เด็กต้องทำ
 *
 * `wordIds` คือคำที่หน้าจอนั้นถาม ใช้นับจำนวนข้อของทั้งด่าน
 * ส่วนตัวลวงไม่ได้เก็บไว้ในนี้ แต่สุ่มในตอนวาดจาก seed ของ item
 * (ดู lib/content/distractors.ts) เพื่อให้ตัวข้อมูลด่านเล็กและอ่านง่าย
 */
export type MatchItem = {
  kind: "match";
  id: string;
  wordIds: string[];
};

export type ClozeItem = {
  kind: "cloze";
  id: string;
  wordIds: string[];
  level: ClozeLevel;
};

export type PictureItem = {
  kind: "picture";
  id: string;
  wordIds: string[];
  variant: PictureVariant;
};

export type ListenItem = {
  kind: "listen";
  id: string;
  wordIds: string[];
};

/**
 * พูดคำให้ระบบฟัง (G5)
 *
 * ไม่มีโหมดย่อยและไม่มีระดับความช่วยเหลือ ต่างจากโหมดอื่น เพราะการพูด
 * ลดความยากลงไม่ได้ — คำหนึ่งจะพูดถูกหรือไม่ถูก ไม่มีขั้น "พูดแบบมีตัวเลือก"
 * ความช่วยเหลือของโหมดนี้อยู่ที่จำนวนครั้งที่ให้ลองและคำแนะนำการออกเสียงแทน
 */
export type SayItem = {
  kind: "say";
  id: string;
  wordIds: string[];
};

export type Item = MatchItem | ClozeItem | PictureItem | ListenItem | SayItem;

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

/**
 * เรื่องอ่านสั้นสำหรับโหมดอ่านออกเสียง (G6)
 *
 * แยกประโยคเป็นรายการ ไม่ใช่ก้อนข้อความเดียว เพราะเกมไฮไลต์ทีละประโยค
 * และต้องให้เด็กกดฟังเสียงต้นแบบทีละประโยคได้ ถ้าเก็บเป็นก้อนเดียวจะต้อง
 * ตัดประโยคด้วยจุดตอนแสดงผล ซึ่งพังทันทีที่มีคำย่อหรือตัวเลขทศนิยม
 */
export const readingSchema = z.object({
  id: z.string().min(1),
  cefr: cefrLevelSchema,
  titleTh: z.string().min(1),
  titleEn: z.string().min(1),
  sentences: z.array(z.string().min(1)).min(1),
  /**
   * คำถามท้ายเรื่องเป็นภาษาไทย เพราะวัด "เข้าใจเรื่องที่อ่านไหม"
   * ถ้าถามเป็นภาษาอังกฤษ เด็กที่เข้าใจเรื่องแต่ยังอ่านคำถามไม่ออกจะตอบผิด
   * ซึ่งกลายเป็นวัดการอ่านคำถามแทนที่จะวัดความเข้าใจเรื่อง
   */
  question: z.object({
    promptTh: z.string().min(1),
    choicesTh: z.array(z.string().min(1)).length(3),
    answerIndex: z.number().int().min(0).max(2),
  }),
});
export type Reading = z.infer<typeof readingSchema>;

export const lessonResultSchema = z.object({
  lessonId: z.string(),
  stars: z.number().int().min(0).max(3),
  bestAccuracy: z.number().min(0).max(1),
  completedAt: z.string(),
});
export type LessonResult = z.infer<typeof lessonResultSchema>;
