import { UNITS, WORDS, getWord } from "@/lib/content";
import type { Mastery } from "@/lib/types";

/**
 * ชุดคำแบบคละทุกหัวข้อที่เคยเรียน (G13)
 *
 * **ต่างจากด่านทบทวนรายวันที่ `/review` อย่างไร**
 *
 * ด่านทบทวนตอบคำถามว่า "คำไหนกำลังจะลืม" แล้วหยิบตามคิวของ FSRS ผลคือ
 * ชุดหนึ่งอาจมาจากหัวข้อเดียวทั้งชุด เพราะคำที่เรียนวันเดียวกันก็ถึงกำหนด
 * วันเดียวกัน ด่านนี้ตอบคำถามว่า **"ยังใช้ของที่เรียนมาทั้งหมดได้ไหม"**
 * จึงบังคับให้ทุกหัวข้อที่เคยแตะมีคำโผล่มา แล้วสลับให้ปนกันทั้งชุด
 *
 * ทำไมการสลับปนหัวข้อสำคัญ: การฝึกแบบเรียงหัวข้อ (สีทั้งชุด แล้วสัตว์ทั้งชุด)
 * ทำให้เด็กเดาได้จากบริบทว่าคำตอบต้องเป็นสีหรือเป็นสัตว์ โดยไม่ต้องนึกคำจริง
 * เมื่อปนหัวข้อ เด็กต้องดึงคำจากคลังทั้งหมดในหัวทุกข้อ ซึ่งเป็นสิ่งที่
 * การใช้ภาษาจริงต้องทำ และเป็นงานที่หนักกว่าการทบทวนทีละบท
 */

/** คำต่อหนึ่งรอบ — มากกว่าด่านทบทวนเพราะจุดประสงค์คือกวาดให้กว้าง */
export const MIXED_DECK_SIZE = 12;

/** ลำดับหัวข้อตามหลักสูตร ใช้ไล่เก็บคำแบบวนรอบ */
const UNIT_ORDER = new Map(UNITS.map((unit, index) => [unit.id, index]));

/** ลำดับคำในหลักสูตร ใช้ตัดสินเมื่อดาวเท่ากัน ให้ผลคงที่ */
const WORD_ORDER = new Map(WORDS.map((word, index) => [word.id, index]));

export type MixedDeck = {
  wordIds: string[];
  /** กี่หัวข้อที่ชุดนี้กวาดมา ใช้บอกเด็กว่ากำลังทบทวนกว้างแค่ไหน */
  unitCount: number;
};

/** ดาวรวมทั้งสี่ทักษะ — ใช้วัดว่าคำไหน "อ่อนที่สุด" ในหัวข้อนั้น */
function totalStars(entry: Mastery): number {
  return entry.recognize + entry.listen + entry.speak + entry.write;
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
 * เลือกคำคละทุกหัวข้อที่เคยเรียน
 *
 * ไล่เก็บแบบวนรอบหัวข้อ (หัวข้อละหนึ่งคำต่อรอบ) ไม่ใช่เรียงตามความอ่อน
 * ของคำทั่วทั้งคลัง เพราะถ้าเรียงตามความอ่อนล้วน หัวข้อที่เพิ่งเรียน
 * จะกินทั้งชุดไปเอง (คำใหม่ดาวน้อยที่สุดเสมอ) แล้วหัวข้อเก่าจะไม่ถูกแตะเลย
 * ซึ่งเป็นสิ่งที่ด่านนี้มีไว้แก้
 *
 * ภายในหัวข้อเดียวกันจึงเลือกคำที่อ่อนที่สุดก่อน เพื่อให้รอบหนึ่งได้ทั้ง
 * ความกว้าง (ทุกหัวข้อ) และความตรงจุด (คำที่ยังไม่แน่นในหัวข้อนั้น)
 */
export function buildMixedDeck({
  mastery,
  size = MIXED_DECK_SIZE,
  random = Math.random,
}: {
  /** ดาวความชำนาญของคำที่เด็กเคยเจอ — คำที่ไม่เคยเจอไม่อยู่ในนี้ */
  mastery: Record<string, Mastery>;
  size?: number;
  random?: () => number;
}): MixedDeck {
  const byUnit = new Map<string, Mastery[]>();

  for (const entry of Object.values(mastery)) {
    const word = getWord(entry.wordId);
    // ข้ามคำที่หลุดจากคลังไปแล้ว (ความคืบหน้าเก่าในเครื่อง)
    if (!word) continue;

    const bucket = byUnit.get(word.unitId);
    if (bucket) bucket.push(entry);
    else byUnit.set(word.unitId, [entry]);
  }

  // หัวข้อเรียงตามหลักสูตร คำในหัวข้อเรียงจากอ่อนที่สุด
  const queues = [...byUnit.entries()]
    .sort(
      ([a], [b]) => (UNIT_ORDER.get(a) ?? 0) - (UNIT_ORDER.get(b) ?? 0),
    )
    .map(([, entries]) =>
      entries
        .sort((a, b) => {
          const stars = totalStars(a) - totalStars(b);
          if (stars !== 0) return stars;
          return (
            (WORD_ORDER.get(a.wordId) ?? 0) - (WORD_ORDER.get(b.wordId) ?? 0)
          );
        })
        .map((entry) => entry.wordId),
    );

  const picked: string[] = [];

  // วนรอบละหนึ่งคำต่อหัวข้อ จนครบจำนวนหรือหมดคำ
  for (let round = 0; picked.length < size; round += 1) {
    const available = queues.filter((queue) => queue.length > round);
    if (available.length === 0) break;

    for (const queue of available) {
      if (picked.length >= size) break;
      picked.push(queue[round]);
    }
  }

  /**
   * สลับท้ายสุดเพื่อให้หัวข้อปนกันจริง
   *
   * ถ้าไม่สลับ ลำดับจะเป็นวงรอบที่เดาได้ (สี → ตัวเลข → สัตว์ → สี → …)
   * ซึ่งเด็กจับจังหวะได้ว่าข้อถัดไปจะเป็นหัวข้ออะไร แล้วการปนหัวข้อ
   * ก็เสียประโยชน์ที่ตั้งใจให้มีไป
   */
  return {
    wordIds: shuffle(picked, random),
    unitCount: new Set(
      picked.map((wordId) => getWord(wordId)?.unitId),
    ).size,
  };
}
