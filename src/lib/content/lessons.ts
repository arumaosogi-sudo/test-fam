import type {
  ClozeLevel,
  GameMode,
  Item,
  Lesson,
  PictureVariant,
  Word,
} from "@/lib/types";

import { UNITS, wordsInUnit } from "./index";

/** คำต่อหนึ่งด่าน — 5 คำคือจำนวนที่เด็กอนุบาลรับไหวในหนึ่งรอบ */
export const WORDS_PER_LESSON = 5;

/** คู่คำต่อหนึ่งหน้าจอของเกมจับคู่ */
export const PAIRS_PER_MATCH_ITEM = 5;

/** โหมดที่ด่านปกติใช้ เรียงตามลำดับที่เด็กจะได้เจอ */
export const LESSON_MODES: GameMode[] = [
  "match",
  "listen",
  "picture",
  "cloze",
];

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
    modes: LESSON_MODES,
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

/** ดาวความชำนาญของคำหนึ่ง เท่าที่ใช้ตัดสินความยากของข้อ */
export type WordLevel = {
  /** จำคำได้ 0–5 */
  recognize: number;
  /** เขียนคำได้ 0–5 */
  write: number;
};

/**
 * ระดับความช่วยเหลือของเกมเติมคำ ตัดสินจากดาวความชำนาญของคำนั้น
 *
 * ใช้ข้อมูลที่เก็บอยู่แล้วแทนการให้เด็กเลือกระดับเอง เพราะเด็กเลือกไม่เป็น
 * และการไล่ระดับต่อคำ (ไม่ใช่ต่อทั้งแอป) ทำให้คำที่เพิ่งเจอยังมีตัวเลือกให้
 * ส่วนคำที่คุ้นแล้วต้องเขียนเอง
 *
 * ขั้นแรกดูที่ "จำคำได้" ไม่ใช่ "เขียนได้" โดยตั้งใจ: ถ้าใช้ดาวเขียนเป็นเกณฑ์
 * ของขั้นแรก ระบบจะล็อกตัวเอง เพราะข้อที่เพิ่มดาวเขียนคือข้อที่ต้องมีดาวเขียน
 * ถึงจะได้เล่น เด็กจึงติดอยู่ที่ระดับง่ายสุดตลอดไป (เจอตอนทดสอบเล่นจริง)
 * ลำดับนี้ยังตรงกับลำดับการเรียนภาษาด้วย — จำคำได้ก่อน แล้วค่อยผลิตคำเองได้
 */
export function clozeLevelFor({ recognize, write }: WordLevel): ClozeLevel {
  // พิมพ์เองคือขั้นที่ยากที่สุด ต้องต่อตัวอักษรได้คล่องก่อน
  if (write >= 3) return "type";
  if (recognize >= 2) return "tiles";
  return "bank";
}

/** โหมดย่อยของเกมดูภาพ ใช้เกณฑ์เดียวกับขั้นแรกของเกมเติมคำ */
export function pictureVariantFor({ recognize }: WordLevel): PictureVariant {
  return recognize >= 2 ? "spell" : "choose";
}

/**
 * สร้างหน้าจอที่ต้องเล่นในหนึ่งด่าน
 *
 * ลำดับคือ จับคู่ทั้งชุด → ฟังทีละคำ → ผลิตคำเองทีละคำ
 * ไล่จาก "เห็นคำตอบอยู่บนจอ" ไปจนถึง "ต้องนึกคำออกมาเอง" ซึ่งเป็นลำดับ
 * ที่ความจำถูกใช้งานหนักขึ้นเรื่อย ๆ ไม่ใช่เล่นโหมดเดิมซ้ำสองรอบ
 *
 * ด่านหนึ่งจึงมี 3 ข้อต่อหนึ่งคำ (จำได้ / ฟังออก / เขียนได้) ซึ่งตรงกับ
 * เงื่อนไขว่าคำหนึ่งจะนับว่า "รู้จริง" ต้องผ่านหลายทาง
 *
 * @param levelOf ดาวความชำนาญของแต่ละคำ ใช้เลือกระดับความช่วยเหลือของข้อ
 */
export function buildItems(
  lesson: Lesson,
  random: () => number = Math.random,
  levelOf: (wordId: string) => WordLevel = () => ({ recognize: 0, write: 0 }),
): Item[] {
  const matchWords = shuffle(lesson.wordIds, random).slice(
    0,
    PAIRS_PER_MATCH_ITEM,
  );

  const listenItems: Item[] = shuffle(lesson.wordIds, random).map(
    (wordId, index) => ({
      kind: "listen",
      id: `${lesson.id}-listen-${index + 1}`,
      wordIds: [wordId],
    }),
  );

  // สลับโหมดผลิตคำทีละคำ ไม่ให้เด็กเจอเกมเดียวกันห้าจอติด
  const produceItems: Item[] = shuffle(lesson.wordIds, random).map(
    (wordId, index) => {
      const level = levelOf(wordId);

      if (index % 2 === 0) {
        return {
          kind: "picture",
          id: `${lesson.id}-picture-${index + 1}`,
          wordIds: [wordId],
          variant: pictureVariantFor(level),
        };
      }

      return {
        kind: "cloze",
        id: `${lesson.id}-cloze-${index + 1}`,
        wordIds: [wordId],
        level: clozeLevelFor(level),
      };
    },
  );

  return [
    { kind: "match", id: `${lesson.id}-match-1`, wordIds: matchWords },
    ...listenItems,
    ...produceItems,
  ];
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
