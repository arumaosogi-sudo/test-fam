import { describe, expect, it } from "vitest";

import { passageWords } from "@/lib/content/readings";
import { READINGS } from "@/lib/content/readings";

import { alignReading, paceLabel, scoreReading } from "./read-aloud";

const PASSAGE = ["I", "have", "a", "cat"];

describe("alignReading", () => {
  it("อ่านตรงทุกคำได้ครบ", () => {
    const result = alignReading(PASSAGE, ["I", "have", "a", "cat"]);

    expect(result.matched).toBe(4);
    expect(result.cursor).toBe(4);
    expect(result.missed).toEqual([]);
  });

  it("ไม่สนตัวพิมพ์และเครื่องหมายวรรคตอนที่ตัวถอดเสียงใส่มา", () => {
    const result = alignReading(PASSAGE, ["i", "HAVE", "a", "Cat."]);

    expect(result.matched).toBe(4);
  });

  it("อ่านไม่จบ คำที่เหลือนับเป็นอ่านไม่ถึง", () => {
    const result = alignReading(PASSAGE, ["I", "have"]);

    expect(result.matched).toBe(2);
    expect(result.missed).toEqual(["a", "cat"]);
  });

  it("ข้ามคำกลางเรื่องได้ และคำที่ข้ามถูกนับว่าไม่ตรง", () => {
    const result = alignReading(PASSAGE, ["I", "a", "cat"]);

    expect(result.matched).toBe(3);
    expect(result.missed).toEqual(["have"]);
  });

  /** ตัวถอดเสียงมักแทรกคำที่ไม่มีใครพูดเข้ามา ไม่ควรทำให้ทั้งเรื่องเพี้ยน */
  it("คำที่ตัวถอดเสียงแทรกมาเกินถูกข้ามไป", () => {
    const result = alignReading(PASSAGE, ["I", "um", "have", "a", "cat"]);

    expect(result.matched).toBe(4);
    expect(result.missed).toEqual([]);
  });

  it("ยอมรับคำพ้องเสียง เพราะเสียงถูกแต่ตัวสะกดที่ถอดได้เป็นอีกคำ", () => {
    const result = alignReading(["I", "see", "two", "cats"], [
      "I",
      "sea",
      "to",
      "cats",
    ]);

    expect(result.matched).toBe(4);
  });

  /**
   * ตัวไฮไลต์ใช้ cursor ถ้ามันถอยหลังได้ ไฮไลต์จะกระโดดกลับเวลาตัวถอดเสียง
   * แก้ข้อความที่เดาไว้ก่อนหน้า
   */
  it("cursor เดินหน้าอย่างเดียว ไม่ถอยกลับ", () => {
    const passage = ["one", "two", "three", "one"];
    const result = alignReading(passage, ["one", "two", "three", "one"]);

    expect(result.cursor).toBe(4);

    // พูดคำซ้ำที่ตรงกับคำก่อนหน้า ต้องไม่ดึง cursor กลับ
    const repeated = alignReading(passage, ["one", "two", "one"]);
    expect(repeated.cursor).toBeGreaterThanOrEqual(3);
  });

  it("ไม่ได้ยินอะไรเลยคือไม่ตรงทั้งเรื่อง", () => {
    const result = alignReading(PASSAGE, []);

    expect(result.matched).toBe(0);
    expect(result.cursor).toBe(0);
    expect(result.missed).toEqual(PASSAGE);
  });

  it("เรื่องว่างไม่ทำให้พัง", () => {
    expect(alignReading([], ["cat"])).toEqual({
      cursor: 0,
      matched: 0,
      missed: [],
    });
  });

  it("อ่านเรื่องจริงทั้งเรื่องแบบถูกทุกคำได้ 100%", () => {
    for (const reading of READINGS) {
      const words = passageWords(reading);
      const result = alignReading(words, words);

      expect(result.matched, reading.id).toBe(words.length);
      expect(result.missed, reading.id).toEqual([]);
    }
  });
});

describe("scoreReading", () => {
  it("คิดความแม่นเป็นสัดส่วนของคำที่อ่านตรง", () => {
    const score = scoreReading(PASSAGE, ["I", "have"], 10_000);

    expect(score.total).toBe(4);
    expect(score.accuracy).toBe(0.5);
  });

  it("คิดความเร็วเป็นคำที่อ่านถูกต่อนาที", () => {
    // อ่านถูก 4 คำใน 30 วินาที = 8 คำ/นาที
    const score = scoreReading(PASSAGE, PASSAGE, 30_000);

    expect(score.wcpm).toBe(8);
  });

  /**
   * เวลาสั้นมากแปลว่าเด็กกดหยุดทันทีหรือไมค์ไม่ติด การคิดความเร็วจาก
   * เวลาแบบนั้นจะได้ตัวเลขมหาศาลที่ไม่มีความหมาย ดีกว่าบอกว่าวัดไม่ได้
   */
  it("เวลาน้อยเกินไปคืนค่าความเร็วเป็น null ไม่ใช่ตัวเลขเพี้ยน", () => {
    expect(scoreReading(PASSAGE, PASSAGE, 200).wcpm).toBeNull();
    expect(scoreReading(PASSAGE, PASSAGE, 0).wcpm).toBeNull();
  });

  it("เรื่องว่างได้ความแม่น 0 ไม่ใช่ NaN", () => {
    expect(scoreReading([], [], 5000).accuracy).toBe(0);
  });
});

describe("paceLabel", () => {
  it("บอกระดับความเร็วเป็นคำพูด", () => {
    expect(paceLabel(null)).toContain("วัดความเร็ว");
    expect(paceLabel(10)).toContain("ไม่ต้องรีบ");
    expect(paceLabel(30)).toContain("กำลังคล่องขึ้น");
    expect(paceLabel(60)).toContain("คล่องดี");
    expect(paceLabel(100)).toContain("คล่องมาก");
  });

  it("ทุกช่วงความเร็วมีข้อความ ไม่มีช่องว่าง", () => {
    for (let wcpm = 0; wcpm <= 200; wcpm += 1) {
      expect(paceLabel(wcpm).length, `${wcpm}`).toBeGreaterThan(0);
    }
  });
});
