import { editDistance, normalizeAnswer } from "@/lib/games/spelling";

import type { Heard } from "./types";

/**
 * ตัดสินว่าสิ่งที่ระบบได้ยิน นับว่าเด็กพูดคำเป้าหมายถูกหรือยัง
 *
 * สิ่งที่ตัวตัดสินนี้วัดได้จริงคือ **ความเข้าใจได้** ไม่ใช่ความถูกต้องของสำเนียง:
 * ถ้าระบบถอดเสียงฟังเด็กออกว่าเป็นคำนี้ ก็แปลว่าคนอื่นมีโอกาสฟังออกด้วย
 * ซึ่งตรงกับเป้าหมายของแอปที่ว่า "พูดจนใช้สื่อสารได้จริง" มากกว่าการเทียบ
 * สำเนียงกับเจ้าของภาษาทีละหน่วยเสียง (ซึ่งเครื่องมือฟรีทำไม่ได้อยู่แล้ว)
 *
 * แยกออกมาเป็นฟังก์ชันบริสุทธิ์เพราะเป็นส่วนที่ตัดสินว่าเด็กได้ดาวหรือไม่ได้
 * ต้องเทสได้โดยไม่ต้องมีไมค์ มีเบราว์เซอร์ หรือมีเน็ต
 */

/**
 * คำพ้องเสียงในคลังคำของเรา
 *
 * จำเป็นเพราะตัวถอดเสียงคืน "ตัวสะกด" ไม่ใช่ "เสียง" เด็กที่พูด two ถูกเป๊ะ
 * จะได้ข้อความกลับมาว่า "to" หรือ "too" ตามที่โมเดลภาษาเดาจากบริบท
 * ถ้านับว่าผิดก็เท่ากับลงโทษเด็กที่ออกเสียงถูก ซึ่งผิดทั้งทางวัดผลและทางใจ
 *
 * เก็บเฉพาะคู่ที่ออกเสียงเหมือนกันจริงในสำเนียง General American ที่แอปใช้
 * ไม่ใส่ read/red เพราะ read ในคลังเราเป็นกริยา /ɹid/ ซึ่งเสียงต่างจาก red
 */
const HOMOPHONES: Record<string, string[]> = {
  two: ["to", "too"],
  four: ["for", "fore"],
  eight: ["ate"],
  one: ["won"],
  blue: ["blew"],
  know: ["no"],
  write: ["right", "rite"],
  see: ["sea", "c"],
  sea: ["see", "c"],
  hear: ["here"],
  here: ["hear"],
  buy: ["by", "bye"],
  sun: ["son"],
  where: ["wear", "ware"],
  wear: ["where", "ware"],
  meet: ["meat"],
  new: ["knew"],
  nose: ["knows"],
  flower: ["flour"],
  week: ["weak"],
  high: ["hi"],
  eye: ["i", "aye"],
  read: ["reed"],
  be: ["bee"],
  blew: ["blue"],
};

/**
 * สัดส่วนตัวอักษรที่ผิดได้แล้วยังนับว่า "เกือบถูก"
 *
 * ใช้สัดส่วนไม่ใช่จำนวนตัว เพราะพลาดหนึ่งตัวใน cat (3 ตัว) คือเสียงผิดไปทั้งคำ
 * แต่พลาดหนึ่งตัวใน elephant (8 ตัว) คือคำเดิมที่ฟังเพี้ยนตรงเดียว
 */
const NEAR_RATIO = 0.3;

/** ตัดเครื่องหมายวรรคตอนที่ตัวถอดเสียงใส่มาเอง เช่น "Cat." หรือ "two?" */
function clean(text: string): string {
  return normalizeAnswer(text.replace(/[.,!?;:"'’]/g, ""));
}

export type SpokenVerdict =
  /** ระบบฟังออกว่าเป็นคำเป้าหมาย */
  | { kind: "correct"; heard: string }
  /** ฟังออกเป็นคำที่ใกล้เคียง — ให้ลองอีกครั้งก่อนตัดว่าผิด */
  | { kind: "near"; heard: string }
  /** ฟังออกเป็นอย่างอื่นไปเลย */
  | { kind: "wrong"; heard: string };

/**
 * คำที่ยอมรับได้ทั้งหมดของเป้าหมายหนึ่ง (คำเป้าหมาย + คำพ้องเสียง)
 * แยกไว้ให้เทสและ UI เรียกดูได้ว่าทำไมบางคำผ่านทั้งที่สะกดไม่เหมือน
 */
export function acceptedForms(target: string): string[] {
  const base = clean(target);
  return [base, ...(HOMOPHONES[base] ?? [])];
}

/**
 * ตัดสินผลจากทุกตัวเลือกที่บริการถอดเสียงคืนมา
 *
 * ยอมรับถ้า **ตัวเลือกใดก็ได้** ตรงเป้าหมาย ไม่ใช่เฉพาะตัวแรก เพราะอันดับของ
 * ตัวเลือกมาจากโมเดลภาษาที่เดาจากความถี่ของคำในภาษาอังกฤษทั่วไป ไม่ได้มาจาก
 * ความใกล้เคียงของเสียง คำที่เด็กออกเสียงถูกจึงถูกจัดอันดับรองได้เสมอ
 */
export function judgeSpoken(heard: Heard, target: string): SpokenVerdict {
  const accepted = acceptedForms(target);
  const first = heard.alternatives[0]?.trim() ?? "";

  let bestNear: string | null = null;

  for (const alternative of heard.alternatives) {
    const said = clean(alternative);
    if (said.length === 0) continue;

    if (accepted.includes(said)) {
      return { kind: "correct", heard: alternative.trim() };
    }

    /**
     * เป้าหมายโผล่อยู่ในประโยคที่ถอดได้ ก็นับว่าพูดได้
     * เด็กมักพูดเป็นประโยค ("it's a cat") หรือมีเสียงอื่นติดมา
     * การบังคับให้ข้อความตรงทั้งก้อนจะตัดเด็กที่พูดได้มากกว่าที่โจทย์ขอ
     */
    const spokenWords = said.split(" ");
    if (accepted.some((form) => spokenWords.includes(form))) {
      return { kind: "correct", heard: alternative.trim() };
    }

    if (bestNear === null) {
      const closest = Math.min(
        ...accepted.map((form) => editDistance(said, form)),
      );
      const longest = Math.max(said.length, clean(target).length);
      if (closest / longest <= NEAR_RATIO) bestNear = alternative.trim();
    }
  }

  if (bestNear !== null) return { kind: "near", heard: bestNear };
  return { kind: "wrong", heard: first };
}
