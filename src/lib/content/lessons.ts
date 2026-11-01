import type { Item, Lesson, Word } from "@/lib/types";

import { UNITS, wordsInUnit } from "./index";

/** คำต่อหนึ่งด่าน — 5 คำคือจำนวนที่เด็กอนุบาลรับไหวในหนึ่งรอบ */
export const WORDS_PER_LESSON = 5;

/** คู่คำต่อหนึ่งหน้าจอของเกมจับคู่ */
export const PAIRS_PER_MATCH_ITEM = 5;

/**
 * แบ่งรายการออกเป็นกลุ่มที่ "ขนาดใกล้เคียงกัน" ไม่ใช่แบ่งเต็มกลุ่มแล้วเหลือเศษ
 *
 * เพราะถ้าแบ่งแบบธรรมดา หน่วยที่มี 11 คำจะได้ด่าน 5 + 5 + 1
 * ด่านที่มีคำเดียวไม่คุ้มที่จะเล่น เราจึงเกลี่ยเป็น 4 + 4 + 3 แทน
 */
export function chunkEvenly<T>(items: T[], maxSize: number): T[][] {
  if (items.length === 0 || maxSize <= 0) return [];

  const chunkCount = Math.ceil(items.length / maxSize);
  const baseSize = Math.floor(items.length / chunkCount);
  const remainder = items.length % chunkCount;

  const chunks: T[][] = [];
  let cursor = 0;

  for (let index = 0; index < chunkCount; index += 1) {
    const size = baseSize + (index < remainder ? 1 : 0);
    chunks.push(items.slice(cursor, cursor + size));
    cursor += size;
  }

  return chunks;
}

/** สร้างด่านทั้งหมดของหนึ่งหน่วยจากคำในหน่วยนั้น */
export function buildLessonsForUnit(unitId: string): Lesson[] {
  const words = wordsInUnit(unitId);

  return chunkEvenly(words, WORDS_PER_LESSON).map((group, index) => ({
    id: `${unitId}-l${index + 1}`,
    unitId,
    order: index + 1,
    wordIds: group.map((word) => word.id),
    // P1 มีโหมดเดียว โหมดอื่นจะถูกเพิ่มในภารกิจ E2
    modes: ["match"],
  }));
}

/** ด่านทั้งหมดของหลักสูตร เรียงตามลำดับหน่วย */
export const LESSONS: Lesson[] = UNITS.flatMap((unit) =>
  buildLessonsForUnit(unit.id),
);

const lessonById = new Map(LESSONS.map((lesson) => [lesson.id, lesson]));

export function getLesson(id: string): Lesson | undefined {
  return lessonById.get(id);
}

export function lessonsInUnit(unitId: string): Lesson[] {
  return LESSONS.filter((lesson) => lesson.unitId === unitId);
}

/** ด่านก่อนหน้าในลำดับหลักสูตร ใช้ตัดสินว่าด่านนี้ปลดล็อกหรือยัง */
export function previousLesson(lessonId: string): Lesson | undefined {
  const index = LESSONS.findIndex((lesson) => lesson.id === lessonId);
  if (index <= 0) return undefined;
  return LESSONS[index - 1];
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * สร้างหน้าจอที่ต้องเล่นในหนึ่งด่าน
 *
 * ตอนนี้เด็กจะได้เจอคำชุดเดิมสองรอบ (สลับตำแหน่งกัน) เพราะมีโหมดเดียว
 * การเจอซ้ำช่วยความจำอยู่แล้ว แต่พอเปิดโหมดเติมคำกับฟังเสียงในภารกิจ E2
 * รอบที่สองจะเปลี่ยนเป็นคนละโหมดแทนการเล่นซ้ำ
 */
export function buildItems(
  lesson: Lesson,
  random: () => number = Math.random,
): Item[] {
  const rounds = 2;

  return Array.from({ length: rounds }, (_, round) => ({
    kind: "match" as const,
    id: `${lesson.id}-match-${round + 1}`,
    wordIds: shuffle(lesson.wordIds, random).slice(0, PAIRS_PER_MATCH_ITEM),
  }));
}

/** จำนวนข้อที่ต้องตอบทั้งด่าน ใช้คำนวณความแม่นยำ */
export function totalAnswersInLesson(lesson: Lesson): number {
  return buildItems(lesson, () => 0).reduce(
    (sum, item) => sum + item.wordIds.length,
    0,
  );
}

/** คำทั้งหมดของด่าน พร้อมข้อมูลเต็ม */
export function lessonWords(
  lesson: Lesson,
  lookup: (id: string) => Word | undefined,
): Word[] {
  return lesson.wordIds
    .map(lookup)
    .filter((word): word is Word => word !== undefined);
}
