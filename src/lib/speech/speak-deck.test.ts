import { describe, expect, it } from "vitest";

import { WORDS } from "@/lib/content";
import type { Mastery } from "@/lib/types";

import { buildSpeakDeck, SPEAK_DECK_SIZE } from "./speak-deck";

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

describe("buildSpeakDeck", () => {
  it("ยังไม่เคยเจอคำไหนเลยก็ได้ชุดว่าง ไม่ลากคำใหม่เข้ามา", () => {
    expect(buildSpeakDeck({ mastery: {} })).toEqual([]);
  });

  it("หยิบคำที่ดาวทักษะพูดน้อยสุดมาก่อน", () => {
    const deck = buildSpeakDeck({
      mastery: mastery({
        "w-red": { speak: 4 },
        "w-blue": { speak: 0 },
        "w-green": { speak: 2 },
      }),
      limit: 3,
    });

    expect(deck).toEqual(["w-blue", "w-green", "w-red"]);
  });

  /**
   * เหตุผลที่ด่านนี้ไม่ใช้คิวของ FSRS: คำที่จำความหมายได้แม่นแต่ไม่เคยออกเสียง
   * จะไม่ถึงกำหนดทบทวนเลย ทั้งที่เป็นคำที่ต้องซ้อมพูดที่สุด
   */
  it("ไม่สนดาวทักษะอื่น ดูแต่ดาวทักษะพูด", () => {
    const deck = buildSpeakDeck({
      mastery: mastery({
        "w-red": { recognize: 0, listen: 0, write: 0, speak: 5 },
        "w-blue": { recognize: 5, listen: 5, write: 5, speak: 1 },
      }),
      limit: 1,
    });

    expect(deck).toEqual(["w-blue"]);
  });

  it("ไม่เกินจำนวนคำต่อรอบ", () => {
    const many = mastery(
      Object.fromEntries(WORDS.slice(0, 40).map((word) => [word.id, {}])),
    );

    expect(buildSpeakDeck({ mastery: many }).length).toBe(SPEAK_DECK_SIZE);
  });

  /**
   * ชุดต้องเหมือนกันทุกครั้งที่ข้อมูลเท่าเดิม เพราะ component เรียกตอนวาด
   * ครั้งแรก ถ้าผลไม่คงที่ ชุดคำจะสลับระหว่าง render
   */
  it("ให้ผลเหมือนกันทุกครั้งเมื่อดาวเท่ากัน", () => {
    const same = mastery({
      "w-red": { speak: 1 },
      "w-blue": { speak: 1 },
      "w-green": { speak: 1 },
    });

    const first = buildSpeakDeck({ mastery: same });
    expect(buildSpeakDeck({ mastery: same })).toEqual(first);
    expect(buildSpeakDeck({ mastery: same })).toEqual(first);
  });

  it("ข้ามคำที่ไม่มีอยู่ในคลังคำแล้ว (ข้อมูลเก่าในเครื่อง)", () => {
    const deck = buildSpeakDeck({
      mastery: mastery({ "w-ไม่มีจริง": { speak: 0 }, "w-red": { speak: 3 } }),
    });

    expect(deck).toEqual(["w-red"]);
  });
});
