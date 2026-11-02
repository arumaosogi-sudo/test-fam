import { getWord, WORDS } from "@/lib/content";
import type { Mastery } from "@/lib/types";

/**
 * ชุดคำสำหรับด่านฝึกพูดล้วน
 *
 * ด่านนี้มีเพราะโหมดพูดที่แทรกอยู่ในด่านปกติให้ปริมาณไม่พอ — ด่านละ 9 ข้อ
 * มีข้อพูดราวหนึ่งถึงสองข้อ ซึ่งไม่พอจะ "พูดจนใช้สื่อสารได้จริง"
 * ที่นี่จึงเป็นที่ที่เด็กมาซ้อมพูดรอบเดียวยาว ๆ ได้ตามต้องการ
 *
 * เลือกคำด้วยดาวทักษะพูดที่น้อยที่สุดก่อน ไม่ใช่สุ่ม และไม่ใช่คิวของ FSRS
 * เพราะคิว FSRS ตอบคำถามว่า "คำไหนกำลังจะลืม" ซึ่งเป็นคำถามคนละข้อกับ
 * "คำไหนที่เด็กยังพูดไม่คล่อง" คำที่จำความหมายได้แม่นแต่ไม่เคยออกเสียงเลย
 * จะไม่โผล่ในคิวทบทวนเลยทั้งที่เป็นคำที่ต้องซ้อมพูดที่สุด
 */

/** คำต่อหนึ่งรอบ — มากกว่านี้เด็กเสียงแห้งก่อนจบ */
export const SPEAK_DECK_SIZE = 8;

/** ลำดับของคำในหลักสูตร ใช้เป็นตัวตัดสินเมื่อดาวเท่ากัน ให้ผลคงที่ทุกครั้ง */
const CURRICULUM_ORDER = new Map(WORDS.map((word, index) => [word.id, index]));

export type SpeakDeckInput = {
  /** ดาวความชำนาญของคำที่เด็กเคยเจอ — คำที่ไม่เคยเจอไม่อยู่ในนี้ */
  mastery: Record<string, Mastery>;
  limit?: number;
};

/**
 * คำที่ควรซ้อมพูดรอบนี้ เรียงจากที่ยังพูดไม่ได้มากที่สุด
 *
 * หยิบจากคำที่ "เคยเจอแล้ว" เท่านั้น ไม่ลากคำใหม่เข้ามา เพราะการให้เด็ก
 * ออกเสียงคำที่ยังไม่รู้ความหมายคือการให้ท่องเสียงเปล่า ๆ ไม่ใช่การใช้ภาษา
 */
export function buildSpeakDeck({
  mastery,
  limit = SPEAK_DECK_SIZE,
}: SpeakDeckInput): string[] {
  return Object.values(mastery)
    .filter((entry) => getWord(entry.wordId) !== undefined)
    .sort((a, b) => {
      if (a.speak !== b.speak) return a.speak - b.speak;
      return (
        (CURRICULUM_ORDER.get(a.wordId) ?? 0) -
        (CURRICULUM_ORDER.get(b.wordId) ?? 0)
      );
    })
    .slice(0, limit)
    .map((entry) => entry.wordId);
}
