import type {
  CefrLevel,
  ClozeLevel,
  GameMode,
  Item,
  Lesson,
  PictureVariant,
  Word,
} from "@/lib/types";

import { UNITS, getWord, wordsInUnit } from "./index";

/** คำต่อหนึ่งด่าน — 5 คำคือจำนวนที่เด็กอนุบาลรับไหวในหนึ่งรอบ */
export const WORDS_PER_LESSON = 5;

/** ระดับความช่วยเหลือเรียงจากง่ายไปยาก ใช้เทียบว่าอันไหนยากกว่ากัน */
const CLOZE_ORDER: ClozeLevel[] = ["bank", "tiles", "type"];

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

/**
 * คำนี้เล่นเกมเติมคำได้ไหม — ต้องมีประโยคตัวอย่างก่อน
 *
 * คำที่นำเข้าจาก NGSL ยังไม่มีประโยค (ดู docs/CURRICULUM.md) เกมเติมคำจึงข้ามไป
 * แล้วให้ข้อดูภาพแทน ดีกว่าโชว์ประโยคเปล่าหรือทำให้ทั้งด่านพัง
 */
function canCloze(wordId: string): boolean {
  return Boolean(getWord(wordId)?.sentence);
}

/** คำนี้มีภาพให้ดูไหม — คำนามธรรมอย่าง think หรือ important ไม่มี */
function canPicture(wordId: string): boolean {
  return Boolean(getWord(wordId)?.image);
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
export function clozeLevelFor(
  { recognize, write }: WordLevel,
  floor: ClozeLevel = "bank",
): ClozeLevel {
  // พิมพ์เองคือขั้นที่ยากที่สุด ต้องต่อตัวอักษรได้คล่องก่อน
  const earned: ClozeLevel =
    write >= 3 ? "type" : recognize >= 2 ? "tiles" : "bank";

  return CLOZE_ORDER.indexOf(earned) >= CLOZE_ORDER.indexOf(floor)
    ? earned
    : floor;
}

/** โหมดย่อยของเกมดูภาพ ใช้เกณฑ์เดียวกับขั้นแรกของเกมเติมคำ */
export function pictureVariantFor(
  { recognize }: WordLevel,
  floor: ClozeLevel = "bank",
): PictureVariant {
  return recognize >= 2 || floor !== "bank" ? "spell" : "choose";
}

/**
 * พื้นความยากขั้นต่ำตามระดับที่ผู้เรียนเลือกเอง
 *
 * เด็ก ป.5 ที่เพิ่งเปิดแอปไม่ควรต้องไล่กดเลือกจากสามตัวเลือกไปทั้งหน่วย
 * กว่าดาวความชำนาญจะขึ้นพอให้ได้พิมพ์เอง ระดับที่เลือกจึงเป็น "พื้น"
 * ที่ข้อจะไม่ง่ายไปกว่านี้ ส่วนดาวความชำนาญยังดันให้ยากขึ้นได้อีกตามเดิม
 *
 * เลือกวิธีนี้แทนการข้ามเนื้อหา เพราะคลังคำตอนนี้มีแค่ระดับ Pre-A1
 * การให้ "เลือกระดับแล้วข้ามบท" จะกลายเป็นข้ามไปเจอความว่างเปล่า
 */
export function levelFloorFor(cefr: CefrLevel): ClozeLevel {
  if (cefr === "Pre-A1") return "bank";
  if (cefr === "A1") return "tiles";
  return "type";
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
  floor: ClozeLevel = "bank",
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

      if ((index % 2 === 0 && canPicture(wordId)) || !canCloze(wordId)) {
        return {
          kind: "picture",
          id: `${lesson.id}-picture-${index + 1}`,
          wordIds: [wordId],
          variant: pictureVariantFor(level, floor),
        };
      }

      return {
        kind: "cloze",
        id: `${lesson.id}-cloze-${index + 1}`,
        wordIds: [wordId],
        level: clozeLevelFor(level, floor),
      };
    },
  );

  return [
    { kind: "match", id: `${lesson.id}-match-1`, wordIds: matchWords },
    ...listenItems,
    ...produceItems,
  ];
}

/**
 * สร้างข้อของด่านทบทวน — หนึ่งข้อต่อหนึ่งคำ
 *
 * ต่างจากด่านปกติที่ให้สามข้อต่อคำ เพราะจุดประสงค์คนละอย่าง: ด่านปกติสอนคำใหม่
 * จึงต้องเจอหลายทางกว่าจะติด ส่วนด่านทบทวนแค่ดึงคำที่ใกล้ลืมออกมาใช้หนึ่งครั้ง
 * ให้ตรงจังหวะ ถ้าให้สามข้อต่อคำ ชุดละ 8 คำจะกลายเป็น 24 จอซึ่งยาวเกินไป
 *
 * ไม่มีโหมดจับคู่ในด่านทบทวน เพราะจับคู่เอาคำตอบมาวางให้เห็นบนจออยู่แล้ว
 * จึงวัดไม่ได้ว่าเด็กนึกคำออกเองหรือเปล่า ซึ่งเป็นสิ่งเดียวที่การทบทวนต้องการรู้
 */
export function buildReviewItems(
  wordIds: string[],
  levelOf: (wordId: string) => WordLevel = () => ({ recognize: 0, write: 0 }),
  floor: ClozeLevel = "bank",
): Item[] {
  return wordIds.map((wordId, index) => {
    const level = levelOf(wordId);

    // หมุนสามโหมดเพื่อไม่ให้เด็กเจอเกมเดิมติดกันทั้งชุด
    switch (index % 3) {
      case 0:
        return {
          kind: "listen",
          id: `review-listen-${wordId}`,
          wordIds: [wordId],
        };
      case 1:
        if (canPicture(wordId)) {
          return {
            kind: "picture",
            id: `review-picture-${wordId}`,
            wordIds: [wordId],
            variant: pictureVariantFor(level, floor),
          };
        }
      // ไม่มีภาพก็ตกลงไปใช้ข้อเติมคำแทน
      // falls through
      default:
        if (canCloze(wordId)) {
          return {
            kind: "cloze",
            id: `review-cloze-${wordId}`,
            wordIds: [wordId],
            level: clozeLevelFor(level, floor),
          };
        }
        if (canPicture(wordId)) {
          return {
            kind: "picture",
            id: `review-picture-${wordId}`,
            wordIds: [wordId],
            variant: pictureVariantFor(level, floor),
          };
        }
        // ไม่มีทั้งภาพและประโยค เหลือแค่ให้ฟังเสียง ดีกว่าไม่ได้ทบทวนคำนั้นเลย
        return {
          kind: "listen",
          id: `review-listen-${wordId}`,
          wordIds: [wordId],
        };
    }
  });
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
