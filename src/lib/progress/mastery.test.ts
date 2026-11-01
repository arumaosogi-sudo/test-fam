import { describe, expect, it } from "vitest";

import {
  ALL_SKILLS,
  emptyMastery,
  isMastered,
  isSkillPassed,
  masteryProgress,
  MAX_SKILL_LEVEL,
  SKILL_PASS_LEVEL,
  updateMastery,
} from "./mastery";

describe("updateMastery", () => {
  it("ตอบถูกเพิ่มทีละ 1 และตันที่ 5", () => {
    let mastery = emptyMastery("w1");
    for (let i = 0; i < 10; i += 1) {
      mastery = updateMastery(mastery, "recognize", true);
    }

    expect(mastery.recognize).toBe(MAX_SKILL_LEVEL);
  });

  it("ตอบผิดลดทีละ 1 และไม่ต่ำกว่า 0", () => {
    let mastery = updateMastery(emptyMastery("w1"), "recognize", true);
    for (let i = 0; i < 10; i += 1) {
      mastery = updateMastery(mastery, "recognize", false);
    }

    expect(mastery.recognize).toBe(0);
  });

  it("แตะเฉพาะทักษะที่ฝึก ไม่กระทบทักษะอื่น", () => {
    const mastery = updateMastery(emptyMastery("w1"), "speak", true);

    expect(mastery.speak).toBe(1);
    expect(mastery.recognize).toBe(0);
    expect(mastery.listen).toBe(0);
    expect(mastery.write).toBe(0);
  });

  it("ไม่แก้ไขออบเจกต์เดิม", () => {
    const original = emptyMastery("w1");
    updateMastery(original, "recognize", true);

    expect(original.recognize).toBe(0);
  });
});

describe("isMastered", () => {
  function atLevel(level: number) {
    return {
      wordId: "w1",
      recognize: level,
      listen: level,
      speak: level,
      write: level,
    };
  }

  it("ต้องผ่านครบทุกทักษะที่กำหนดจึงนับว่ารู้จริง", () => {
    expect(isMastered(atLevel(SKILL_PASS_LEVEL))).toBe(true);
    expect(isMastered(atLevel(SKILL_PASS_LEVEL - 1))).toBe(false);
  });

  it("เก่งแค่ทักษะเดียวยังไม่นับว่ารู้จริง", () => {
    const onlyReading = {
      wordId: "w1",
      recognize: MAX_SKILL_LEVEL,
      listen: 0,
      speak: 0,
      write: 0,
    };

    expect(isMastered(onlyReading)).toBe(false);
    // แต่ถ้าวัดเฉพาะทักษะที่แอปเปิดใช้อยู่ ถือว่าผ่าน
    expect(isMastered(onlyReading, ["recognize"])).toBe(true);
    expect(isSkillPassed(onlyReading, "recognize")).toBe(true);
  });
});

describe("masteryProgress", () => {
  it("ยังไม่เริ่มคือ 0 เต็มทุกทักษะคือ 1", () => {
    expect(masteryProgress(emptyMastery("w1"))).toBe(0);
    expect(
      masteryProgress({
        wordId: "w1",
        recognize: 5,
        listen: 5,
        speak: 5,
        write: 5,
      }),
    ).toBe(1);
  });

  it("อยู่ในช่วง 0 ถึง 1 เสมอ", () => {
    const mastery = { wordId: "w1", recognize: 3, listen: 1, speak: 0, write: 5 };
    const value = masteryProgress(mastery, ALL_SKILLS);

    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(1);
  });

  it("ไม่หารด้วยศูนย์เมื่อไม่ได้ระบุทักษะเลย", () => {
    expect(masteryProgress(emptyMastery("w1"), [])).toBe(0);
  });
});
