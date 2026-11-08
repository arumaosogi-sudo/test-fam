import { describe, expect, it } from "vitest";

import { UNITS } from "@/lib/content";
import { CEFR_ORDER, type CefrLevel } from "@/lib/types";

import {
  CHAT_TOPICS,
  FREE_TOPIC_ID,
  getTopic,
  topicWords,
  ungroupedUnits,
} from "./topics";

describe("หัวข้อคุยกับ Milo", () => {
  /**
   * ด่านสำคัญที่สุดของไฟล์นี้
   *
   * หน้าแชทเคยไล่ UNITS ทั้งหมดมาทำปุ่ม พอจัดเป็นหมวดแล้วหน่วยที่ไม่ได้
   * อยู่ในหมวดไหนเลยจะหายไปจากหน้าแชทเงียบ ๆ โดยไม่มีอะไรเตือน
   * เทสนี้จึงบังคับว่าหน่วยใหม่ทุกหน่วยต้องถูกจัดเข้าหมวดก่อนเสมอ
   */
  it("ทุกหน่วยในคลังถูกจัดเข้าหมวดแล้ว ไม่มีหน่วยตกหล่น", () => {
    expect(ungroupedUnits()).toEqual([]);
  });

  it("ไม่มีหน่วยไหนอยู่สองหมวด", () => {
    const all = CHAT_TOPICS.flatMap((topic) => topic.unitIds);
    expect(new Set(all).size).toBe(all.length);
  });

  it("ทุกหน่วยที่หมวดอ้างถึงมีอยู่จริงในคลัง", () => {
    const real = new Set(UNITS.map((unit) => unit.id));
    for (const topic of CHAT_TOPICS) {
      for (const unitId of topic.unitIds) {
        expect(real.has(unitId), `${topic.id} อ้าง ${unitId}`).toBe(true);
      }
    }
  });

  it("id ของหมวดไม่ซ้ำ และหาเจอด้วย getTopic", () => {
    const ids = CHAT_TOPICS.map((topic) => topic.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getTopic("food")?.titleEn).toBe("Food and Drinks");
    expect(getTopic("ไม่มีจริง")).toBeUndefined();
  });

  /** เมนูที่ยาวเกินไปคือปัญหาที่หมวดนี้มาแก้ ถ้ามันยาวอีกก็แปลว่าแก้ไม่สำเร็จ */
  it("จำนวนหมวดน้อยพอที่เด็กจะเลือกได้ในหน้าจอเดียว", () => {
    expect(CHAT_TOPICS.length).toBeLessThanOrEqual(10);
    expect(CHAT_TOPICS.length).toBeGreaterThan(1);
  });

  it("หมวดแรกคือคุยอะไรก็ได้ และไม่ผูกกับหน่วยไหน", () => {
    expect(CHAT_TOPICS[0].id).toBe(FREE_TOPIC_ID);
    expect(CHAT_TOPICS[0].unitIds).toEqual([]);
  });
});

describe("topicWords", () => {
  /**
   * เพดานระดับต้องเป็นตัวกรองจริงในโค้ด ไม่ใช่แค่ประโยคขอร้องใน prompt
   *
   * ถ้าปล่อยให้คำเกินระดับหลุดเข้าไปในรายการคำเป้าหมาย โมเดลจะหยิบไปใช้
   * แล้วเด็ก A1 จะเจอ hedgehog ของ C1 ในบทสนทนาเรื่องสัตว์
   */
  it("ไม่คืนคำที่ระดับสูงกว่าเด็ก ไม่ว่าหมวดไหน", () => {
    for (const topic of CHAT_TOPICS) {
      for (const cefr of CEFR_ORDER) {
        const ceiling = CEFR_ORDER.indexOf(cefr);
        for (const word of topicWords(topic.id, cefr)) {
          expect(
            CEFR_ORDER.indexOf(word.cefr),
            `${topic.id}/${cefr}: ${word.en} (${word.cefr})`,
          ).toBeLessThanOrEqual(ceiling);
        }
      }
    }
  });

  it("เอาคำระดับของเด็กเองขึ้นก่อน เพราะเป็นคำที่ตั้งใจจะสอน", () => {
    const words = topicWords("nature", "B1");
    const firstBelow = words.findIndex((word) => word.cefr !== "B1");
    const lastAtLevel = words.map((word) => word.cefr === "B1").lastIndexOf(true);

    if (firstBelow !== -1 && lastAtLevel !== -1) {
      expect(lastAtLevel).toBeLessThan(firstBelow);
    }
  });

  it("ทุกหมวดมีคำให้คุยในทุกระดับตั้งแต่ A1 ขึ้นไป", () => {
    const levels: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1"];
    for (const topic of CHAT_TOPICS) {
      for (const cefr of levels) {
        expect(
          topicWords(topic.id, cefr).length,
          `${topic.id} ที่ระดับ ${cefr}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("คุยอะไรก็ได้ดึงจากทั้งคลัง จึงมีคำให้เลือกมากกว่าหมวดเจาะจง", () => {
    expect(topicWords(FREE_TOPIC_ID, "A1", 500).length).toBeGreaterThan(
      topicWords("food", "A1", 500).length,
    );
  });

  it("ไม่คืนเกินจำนวนที่ขอ", () => {
    expect(topicWords("nature", "C1", 12).length).toBe(12);
  });
});
