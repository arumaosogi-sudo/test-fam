import { describe, expect, it } from "vitest";

import { DEFAULT_RATING } from "@/lib/adaptive/elo";
import { seededRandom } from "@/lib/random";
import type { SrsCard } from "@/lib/types";

import { REVIEW_DECK_SIZE, buildReviewDeck, countDue } from "./review-deck";

const NOW = new Date("2026-11-02T09:00:00.000Z");

function daysFromNow(days: number) {
  return new Date(NOW.getTime() + days * 86_400_000).toISOString();
}

function card(wordId: string, overrides: Partial<SrsCard> = {}): SrsCard {
  return {
    wordId,
    stability: 10,
    difficulty: 5,
    dueAt: daysFromNow(-1),
    lastReviewedAt: daysFromNow(-11),
    reps: 3,
    lapses: 0,
    state: "review",
    ...overrides,
  };
}

function deckOf(cards: SrsCard[], extra: Parameters<typeof buildReviewDeck>[0] | object = {}) {
  return buildReviewDeck({
    cards: Object.fromEntries(cards.map((item) => [item.wordId, item])),
    wordDifficulty: {},
    now: NOW,
    random: seededRandom("test"),
    ...extra,
  });
}

describe("countDue", () => {
  it("นับเฉพาะคำที่ถึงกำหนดแล้ว", () => {
    const cards = {
      a: card("a", { dueAt: daysFromNow(-2) }),
      b: card("b", { dueAt: daysFromNow(-0.1) }),
      c: card("c", { dueAt: daysFromNow(5) }),
    };

    expect(countDue(cards, NOW)).toBe(2);
  });

  it("ยังไม่เคยเล่นก็ได้ศูนย์ ไม่พัง", () => {
    expect(countDue({}, NOW)).toBe(0);
  });
});

describe("buildReviewDeck", () => {
  it("เรียงคำที่ใกล้ลืมที่สุดไว้ก่อน ไม่ใช่เรียงตามวันนัด", () => {
    // "solid" เลยกำหนดมานานกว่า แต่ความจำแน่นกว่ามาก จึงยังจำได้ดีกว่า
    // ถ้าเรียงตามวันนัดเฉย ๆ คำที่กำลังจะลืมจริงจะถูกดันไปอยู่ท้ายแถว
    const solid = card("solid", {
      stability: 400,
      dueAt: daysFromNow(-30),
      lastReviewedAt: daysFromNow(-60),
    });
    const fragile = card("fragile", {
      stability: 1,
      dueAt: daysFromNow(-1),
      lastReviewedAt: daysFromNow(-6),
    });

    expect(deckOf([solid, fragile]).wordIds).toEqual(["fragile", "solid"]);
  });

  it("ไม่เอาคำที่ยังไม่ถึงกำหนดมานับเป็นคำที่ต้องทบทวน", () => {
    const deck = deckOf([
      card("due", { dueAt: daysFromNow(-1) }),
      card("later", { dueAt: daysFromNow(9) }),
    ]);

    expect(deck.dueCount).toBe(1);
    expect(deck.wordIds[0]).toBe("due");
  });

  it("ชุดไม่เกินขนาดที่กำหนด แม้มีคำค้างเยอะ", () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      card(`w${i}`, { dueAt: daysFromNow(-i - 1) }),
    );
    const deck = deckOf(many);

    expect(deck.wordIds.length).toBe(REVIEW_DECK_SIZE);
    expect(deck.dueCount).toBe(REVIEW_DECK_SIZE);
    expect(new Set(deck.wordIds).size).toBe(REVIEW_DECK_SIZE);
  });

  it("คำถึงกำหนดไม่พอ ก็เติมด้วยคำที่เคยเรียนแล้ว", () => {
    const cards = [
      card("due", { dueAt: daysFromNow(-1) }),
      ...Array.from({ length: 10 }, (_, i) =>
        card(`later${i}`, { dueAt: daysFromNow(10 + i) }),
      ),
    ];
    const deck = deckOf(cards);

    expect(deck.dueCount).toBe(1);
    expect(deck.wordIds.length).toBe(REVIEW_DECK_SIZE);
    expect(deck.wordIds[0]).toBe("due");
    expect(new Set(deck.wordIds).size).toBe(deck.wordIds.length);
  });

  it("คำที่เติมมาต้องไม่ซ้ำกับคำที่ถึงกำหนดอยู่แล้ว", () => {
    const cards = Array.from({ length: 4 }, (_, i) =>
      card(`w${i}`, { dueAt: daysFromNow(-1) }),
    );
    const deck = deckOf(cards);

    expect(deck.wordIds.length).toBe(4);
    expect(new Set(deck.wordIds).size).toBe(4);
  });

  it("เลือกคำเติมที่ความยากใกล้ระดับของเด็ก", () => {
    const cards = [
      card("easy", { dueAt: daysFromNow(9) }),
      card("fit", { dueAt: daysFromNow(9) }),
      card("hard", { dueAt: daysFromNow(9) }),
    ];

    const deck = buildReviewDeck({
      cards: Object.fromEntries(cards.map((item) => [item.wordId, item])),
      // เด็กเก่งระดับ 1000 ควรได้ข้อที่ยากใกล้เคียง ไม่ใช่ข้อที่ง่ายหรือยากสุดขั้ว
      wordDifficulty: { easy: 200, fit: DEFAULT_RATING - 200, hard: 2000 },
      playerRating: DEFAULT_RATING,
      now: NOW,
      size: 1,
      random: seededRandom("pick"),
    });

    expect(deck.dueCount).toBe(0);
    expect(deck.wordIds).toEqual(["fit"]);
  });

  it("ยังไม่เคยเล่นเลยก็ได้ชุดว่าง ไม่พัง", () => {
    expect(deckOf([])).toEqual({ wordIds: [], dueCount: 0 });
  });

  it("seed เดียวกันได้ชุดเดิม", () => {
    const cards = Array.from({ length: 12 }, (_, i) =>
      card(`w${i}`, { dueAt: daysFromNow(20) }),
    );

    expect(deckOf(cards)).toEqual(deckOf(cards));
  });
});
