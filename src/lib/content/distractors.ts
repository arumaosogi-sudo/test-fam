import type { Word } from "@/lib/types";

import { WORDS } from "./index";

/**
 * เลือก "ตัวลวง" ให้ข้อที่มีตัวเลือก (ฟังแล้วเลือก / ดูภาพเลือกคำ / เติมคำจากคลัง)
 *
 * ตัวลวงที่ดีต้องใกล้เคียงคำตอบพอที่เด็กต้องคิด ไม่ใช่สุ่มจากทั้งคลัง
 * เพราะถ้าเอา "แมว" มาเทียบกับ "ยางลบ" กับ "กระโดด" เด็กเดาถูกได้โดยไม่ต้องรู้คำ
 * เราจึงไล่จากใกล้ไปไกล: หน่วยเดียวกันและชนิดคำเดียวกัน → หน่วยเดียวกัน
 * → ชนิดคำเดียวกัน → อะไรก็ได้
 */

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickDistractors(
  answer: Word,
  count: number,
  random: () => number,
  pool: Word[] = WORDS,
): Word[] {
  /*
   * ตัดคำที่สะกดเหมือนคำตอบออกด้วย ไม่ใช่แค่ id ซ้ำ
   * เพราะถ้าตัวเลือกมีคำเดียวกันสองใบ ข้อนั้นจะมีคำตอบถูกสองข้อ
   *
   * และต้องตัดคำที่ **คำแปลไทยตรงกัน** ออกด้วย เพราะด่าน "ฟังแล้วเลือก"
   * จงใจไม่โชว์คำอังกฤษเลย ตัวเลือกบนจอมีแต่คำแปลไทยกับภาพ ถ้าตัวลวงแปลว่า
   * อย่างเดียวกับคำตอบ เด็กจะเห็นสองใบที่เขียนเหมือนกันเป๊ะ แล้วใบหนึ่ง
   * ถูกนับว่าผิด — เป็นปัญหาเดียวกับที่บรรทัดบนกัน แต่คนละด้านของการ์ด
   *
   * ตอนนี้คลังคำมีคู่ที่คำแปลไทยตรงกันสามคู่ (easy/simple = ง่าย ·
   * world/earth = โลก · loud/noisy = ดัง) ซึ่งเป็นคู่คำที่ภาษาไทยใช้คำเดียว
   * ไม่ใช่ข้อมูลผิด ทั้งหกคำอยู่คนละหน่วยและหน่วยของตัวเองมีคำชนิดเดียวกัน
   * เหลือเฟือ ชั้นแรกจึงเติมตัวลวงครบก่อนจะไปถึงคู่แฝดเสมอ — **ยังไม่เคย
   * โผล่จริงบนจอ** ด่านนี้จึงเป็นการกันไว้ ไม่ใช่การแก้ของที่พังอยู่
   * แต่พอหน่วยไหนเหลือคำชนิดเดียวกันน้อยกว่าสามคำเมื่อไร มันจะโผล่ทันที
   */
  const candidates = pool.filter(
    (word) =>
      word.id !== answer.id &&
      word.en !== answer.en &&
      word.th !== answer.th,
  );

  const tiers = [
    candidates.filter(
      (word) => word.unitId === answer.unitId && word.pos === answer.pos,
    ),
    candidates.filter((word) => word.unitId === answer.unitId),
    candidates.filter((word) => word.pos === answer.pos),
    candidates,
  ];

  const picked: Word[] = [];
  const taken = new Set<string>();

  for (const tier of tiers) {
    for (const word of shuffle(tier, random)) {
      if (picked.length >= count) return picked;
      if (taken.has(word.id)) continue;
      taken.add(word.id);
      picked.push(word);
    }
  }

  return picked;
}

/** คำตอบกับตัวลวงรวมกันแล้วสลับตำแหน่ง พร้อมใช้เป็นตัวเลือกบนหน้าจอ */
export function buildChoices(
  answer: Word,
  count: number,
  random: () => number,
  pool: Word[] = WORDS,
): Word[] {
  const distractors = pickDistractors(answer, Math.max(0, count - 1), random, pool);
  return shuffle([answer, ...distractors], random);
}
