import { describe, expect, it } from "vitest";

import { seededRandom } from "@/lib/random";
import type { Mastery } from "@/lib/types";

import { getWord, wordsInUnit } from "./index";
import { buildMixedDeck, MIXED_DECK_SIZE } from "./mixed-deck";

/** ตัวสุ่มที่ไม่สลับอะไรเลย ใช้ดูลำดับก่อนสลับ */
const noShuffle = () => 0;

function mastery(
  entries: Record<string, Partial<Mastery>>,
): Record<string, Mastery> {
  return Object.fromEntries(
    Object.entries(entries).map(([wordId, partial]) => [
      wordId,
      { wordId, recognize: 0, listen: 0, speak: 0, write: 0, ...partial },
    ]),
  );
}

/** ดาวความชำนาญของทุกคำในหน่วยที่ระบุ */
function seenUnits(
  unitIds: string[],
  stars: Partial<Mastery> = {},
): Record<string, Mastery> {
  const entries: Record<string, Partial<Mastery>> = {};
  for (const unitId of unitIds) {
    for (const word of wordsInUnit(unitId)) entries[word.id] = stars;
  }
  return mastery(entries);
}

describe("buildMixedDeck", () => {
  it("ยังไม่เคยเจอคำไหนเลยก็ได้ชุดว่าง", () => {
    expect(buildMixedDeck({ mastery: {} })).toEqual({
      wordIds: [],
      unitCount: 0,
    });
  });

  /**
   * ข้อนี้คือเหตุผลที่ด่านนี้มีอยู่ — ถ้าเลือกคำที่อ่อนที่สุดทั่วคลัง
   * หัวข้อที่เพิ่งเรียน (ดาวน้อยสุดเสมอ) จะกินทั้งชุดไปเอง
   */
  it("กวาดทุกหัวข้อที่เคยเรียน ไม่ให้หัวข้อเดียวกินทั้งชุด", () => {
    const deck = buildMixedDeck({
      mastery: {
        // หัวข้อสีเรียนมานานแล้ว ดาวเยอะ
        ...seenUnits(["u-colors"], { recognize: 5, listen: 5, write: 5 }),
        // หัวข้อสัตว์เพิ่งเรียน ดาวศูนย์ทุกคำ
        ...seenUnits(["u-animals"]),
      },
      random: noShuffle,
    });

    const units = new Set(
      deck.wordIds.map((wordId) => getWord(wordId)?.unitId),
    );

    expect(units).toEqual(new Set(["u-colors", "u-animals"]));
    expect(deck.unitCount).toBe(2);
  });

  it("ภายในหัวข้อเดียวกันหยิบคำที่ดาวรวมน้อยสุดก่อน", () => {
    const deck = buildMixedDeck({
      mastery: mastery({
        "w-red": { recognize: 5, listen: 5, speak: 5, write: 5 },
        "w-blue": { recognize: 1 },
        "w-green": { recognize: 3, listen: 3 },
      }),
      size: 2,
      random: noShuffle,
    });

    expect(new Set(deck.wordIds)).toEqual(new Set(["w-blue", "w-green"]));
  });

  it("ไม่เกินจำนวนคำต่อรอบ", () => {
    const many = seenUnits(["u-colors", "u-numbers", "u-animals", "u-family"]);

    expect(buildMixedDeck({ mastery: many }).wordIds.length).toBe(
      MIXED_DECK_SIZE,
    );
  });

  it("คำที่เคยเจอน้อยกว่าขนาดชุด ก็ได้เท่าที่มี ไม่ลากคำใหม่เข้ามา", () => {
    const deck = buildMixedDeck({
      mastery: mastery({ "w-red": {}, "w-blue": {} }),
    });

    expect(deck.wordIds.length).toBe(2);
  });

  it("ไม่มีคำซ้ำในชุดเดียวกัน", () => {
    const deck = buildMixedDeck({
      mastery: seenUnits(["u-colors", "u-numbers", "u-animals"]),
    });

    expect(new Set(deck.wordIds).size).toBe(deck.wordIds.length);
  });

  it("ข้ามคำที่ไม่มีอยู่ในคลังคำแล้ว (ข้อมูลเก่าในเครื่อง)", () => {
    const deck = buildMixedDeck({
      mastery: mastery({ "w-ไม่มีจริง": {}, "w-red": {} }),
    });

    expect(deck.wordIds).toEqual(["w-red"]);
  });

  /**
   * ถ้าไม่สลับ ลำดับจะเป็นวงรอบหัวข้อที่เดาได้ เด็กจะรู้ว่าข้อถัดไป
   * เป็นหัวข้ออะไรโดยไม่ต้องอ่าน ซึ่งทำให้การปนหัวข้อเสียประโยชน์
   */
  it("สลับให้หัวข้อปนกัน ไม่เรียงเป็นวงรอบที่เดาได้", () => {
    const input = seenUnits(["u-colors", "u-numbers", "u-animals"]);

    const unshuffled = buildMixedDeck({ mastery: input, random: noShuffle })
      .wordIds;
    const shuffled = buildMixedDeck({
      mastery: input,
      random: seededRandom("mixed-test"),
    }).wordIds;

    expect(new Set(shuffled)).toEqual(new Set(unshuffled));
    expect(shuffled).not.toEqual(unshuffled);
  });

  it("seed เดิมได้ชุดเดิม เพื่อไม่ให้ชุดสลับกลางคัน", () => {
    const input = seenUnits(["u-colors", "u-numbers"]);

    const first = buildMixedDeck({
      mastery: input,
      random: seededRandom("same"),
    }).wordIds;
    const second = buildMixedDeck({
      mastery: input,
      random: seededRandom("same"),
    }).wordIds;

    expect(second).toEqual(first);
  });
});
