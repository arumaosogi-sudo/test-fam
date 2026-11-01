import rawUnits from "@/content/units.pre-a1.json";
import rawWords from "@/content/words.pre-a1.json";
import { unitSchema, wordSchema, type Unit, type Word } from "@/lib/types";

/**
 * โหลดคลังคำจากไฟล์ JSON แล้ว validate ด้วย zod
 *
 * ที่ต้อง validate ทั้งที่เป็นไฟล์ของเราเอง เพราะคลังคำจะถูกแก้โดยคนที่ไม่ใช่
 * โปรแกรมเมอร์ (ครู/คนทำเนื้อหา) การพิมพ์ผิดหนึ่งตัวควรพังตั้งแต่ตอน build
 * ไม่ใช่ไปพังตอนเด็กกำลังเล่นอยู่
 */

export const UNITS: Unit[] = unitSchema
  .array()
  .parse(rawUnits)
  .sort((a, b) => a.order - b.order);

export const WORDS: Word[] = wordSchema.array().parse(rawWords);

const wordById = new Map(WORDS.map((word) => [word.id, word]));
const unitById = new Map(UNITS.map((unit) => [unit.id, unit]));

export function getWord(id: string): Word | undefined {
  return wordById.get(id);
}

export function getUnit(id: string): Unit | undefined {
  return unitById.get(id);
}

/** คำทั้งหมดในหน่วย เรียงตามลำดับในไฟล์ */
export function wordsInUnit(unitId: string): Word[] {
  return WORDS.filter((word) => word.unitId === unitId);
}

/** ใช้ตอนต้องการชุดตัวลวงที่ไม่ใช่คำตอบที่ถูก */
export function otherWords(excludeIds: string[], count: number): Word[] {
  const exclude = new Set(excludeIds);
  return WORDS.filter((word) => !exclude.has(word.id)).slice(0, count);
}
