import { describe, expect, it } from "vitest";

import { LESSONS, buildItems } from "@/lib/content/lessons";
import { ALL_SKILLS } from "@/lib/progress/mastery";

import { skillForClozeLevel, skillForItem, skillForPictureVariant } from "./skills";

describe("skillForItem", () => {
  it("จับคู่คือการจำคำได้ ฟังคือการฟัง", () => {
    expect(skillForItem({ kind: "match", id: "a", wordIds: ["w-cat"] })).toBe(
      "recognize",
    );
    expect(skillForItem({ kind: "listen", id: "b", wordIds: ["w-cat"] })).toBe(
      "listen",
    );
  });

  it("โหมดเดียวกันให้คนละทักษะได้ ตามโหมดย่อยที่เด็กเล่น", () => {
    expect(skillForPictureVariant("choose")).toBe("recognize");
    expect(skillForPictureVariant("spell")).toBe("write");

    // เลือกคำจากคลังคือการอ่านประโยคแล้วเลือก ยังไม่ได้เขียนเอง
    expect(skillForClozeLevel("bank")).toBe("recognize");
    expect(skillForClozeLevel("tiles")).toBe("write");
    expect(skillForClozeLevel("type")).toBe("write");
  });

  it("ทุกข้อที่ buildItems สร้าง มีทักษะที่รู้จักกำกับ", () => {
    for (const lesson of LESSONS) {
      for (const item of buildItems(lesson, () => 0)) {
        expect(ALL_SKILLS, item.id).toContain(skillForItem(item));
      }
    }
  });

  it("ด่านหนึ่งฝึกทั้งการจำคำ การฟัง และการเขียน ไม่ใช่ทักษะเดียว", () => {
    const skills = new Set(
      buildItems(LESSONS[0], () => 0, () => ({ recognize: 5, write: 5 })).map(
        skillForItem,
      ),
    );

    expect(skills).toEqual(new Set(["recognize", "listen", "write"]));
  });
});
