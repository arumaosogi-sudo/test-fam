import type { Mastery, Skill } from "@/lib/types";

/**
 * ความชำนาญรายคำ แยกเป็น 4 ทักษะ ทักษะละ 0–5 ดาว
 *
 * เหตุผลที่ต้องแยก: เด็กที่ "เห็นคำว่า cat แล้วรู้ว่าแปลว่าแมว" ยังไม่เท่ากับ
 * "ได้ยินคำว่า cat แล้วเข้าใจ" หรือ "พูดคำว่า cat ออกมาได้ถูก"
 * ถ้าวัดรวมเป็นค่าเดียว เราจะเข้าใจผิดว่าเด็กรู้คำนั้นแล้วทั้งที่พูดไม่ได้
 */

export const ALL_SKILLS: Skill[] = ["recognize", "listen", "speak", "write"];

export const MAX_SKILL_LEVEL = 5;

/** ถือว่าผ่านทักษะนั้นเมื่อถึงระดับนี้ */
export const SKILL_PASS_LEVEL = 4;

export function emptyMastery(wordId: string): Mastery {
  return { wordId, recognize: 0, listen: 0, speak: 0, write: 0 };
}

/**
 * ตอบถูกได้ +1 ตอบผิด -1
 *
 * ที่ลดลงเวลาตอบผิดเพราะเราต้องการให้ตัวเลขสะท้อนความจำ ณ ปัจจุบันจริง ๆ
 * ไม่ใช่แค่สะสมขึ้นอย่างเดียวจนดูเหมือนเด็กเก่งทั้งที่ลืมไปแล้ว
 */
export function updateMastery(
  mastery: Mastery,
  skill: Skill,
  correct: boolean,
): Mastery {
  const current = mastery[skill];
  const next = correct
    ? Math.min(MAX_SKILL_LEVEL, current + 1)
    : Math.max(0, current - 1);

  return { ...mastery, [skill]: next };
}

/** ผ่านทักษะนี้แล้วหรือยัง */
export function isSkillPassed(mastery: Mastery, skill: Skill) {
  return mastery[skill] >= SKILL_PASS_LEVEL;
}

/**
 * รู้คำนี้จริงหรือยัง
 *
 * รับ skills เข้ามาได้ เพราะตอนนี้แอปยังมีแต่โหมดที่ฝึก recognize
 * ถ้าบังคับครบ 4 ทักษะตั้งแต่ตอนนี้ จะไม่มีคำไหน "รู้จริง" ได้เลย
 * พอเปิดโหมดฟัง/พูด/เขียนครบแล้วค่อยเรียกโดยไม่ส่ง skills
 */
export function isMastered(mastery: Mastery, skills: Skill[] = ALL_SKILLS) {
  return skills.every((skill) => isSkillPassed(mastery, skill));
}

/** ความคืบหน้ารวม 0–1 ใช้วาดแถบในสมุดสะสมคำ */
export function masteryProgress(
  mastery: Mastery,
  skills: Skill[] = ALL_SKILLS,
) {
  if (skills.length === 0) return 0;
  const total = skills.reduce((sum, skill) => sum + mastery[skill], 0);
  return total / (skills.length * MAX_SKILL_LEVEL);
}
