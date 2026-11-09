import type { SafetyFlag } from "./types";

/**
 * ด่านตรวจฝั่งเราเอง ที่ไม่ฝากไว้กับโมเดล
 *
 * โมเดลตรวจเรื่องพวกนี้ได้ดีพอสมควร แต่มันคือสิ่งที่เรา "ขอ" ให้มันทำ
 * ไม่ใช่สิ่งที่เรารับประกันได้ — prompt หลุดได้ โมเดลเปลี่ยนรุ่นได้
 * และที่สำคัญกว่านั้น prompt คุมได้แค่สิ่งที่ AI ถาม คุมไม่ได้ว่าเด็กจะพิมพ์อะไรมา
 *
 * ชั้นนี้จึง **ตัดข้อมูลส่วนตัวออกก่อนส่ง** ไม่ใช่แค่ยกธงหลังส่งไปแล้ว
 * เพราะเมื่อข้อความออกจากเครื่องเราไปถึงผู้ให้บริการแล้ว เราเอากลับไม่ได้
 * (ดู docs/PLAN.md หัวข้อ PDPA และความปลอดภัยเด็ก)
 */

/** เรียงจากเบาไปหนัก ใช้ตัดสินว่าธงไหนชนะเมื่อมีสองฝั่ง */
const SEVERITY: Record<SafetyFlag, number> = {
  none: 0,
  off_topic: 1,
  unkind_word: 2,
  // ข้อมูลส่วนตัวหนักกว่าคำหยาบ เพราะส่งออกไปแล้วเอากลับไม่ได้
  personal_info: 3,
  concerning: 4,
};

export function mergeSafetyFlags(a: SafetyFlag, b: SafetyFlag): SafetyFlag {
  return SEVERITY[a] >= SEVERITY[b] ? a : b;
}

export type RedactionKind = "phone" | "id" | "email" | "url";

export type ScreenedMessage = {
  /** ข้อความที่ปลอดภัยพอจะส่งออกไปได้ */
  text: string;
  /** พบอะไรบ้าง ใช้บอกเด็กว่าทำไมข้อความถึงเปลี่ยน */
  found: RedactionKind[];
};

const PLACEHOLDER = "[ตัดออก]";

/**
 * ตัวเลขยาวติดกันตั้งแต่ 9 หลัก ครอบคลุมเบอร์มือถือไทย (10 หลัก)
 * และเลขประจำตัวประชาชน (13 หลัก) โดยไม่ไปโดนเลขที่เด็กใช้เรียนจริง
 * (อายุ จำนวนสิ่งของ ปี พ.ศ.) ซึ่งสั้นกว่านั้นทั้งหมด
 */
const LONG_NUMBER = /\d[\d\s-]{7,}\d/g;
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const URL = /\b(?:https?:\/\/|www\.)\S+/gi;

/** แทนที่แล้วบอกว่าเจอหรือเปล่า โดยไม่ใช้ .test() กับ regex ที่มีแฟลก g */
function redact(
  text: string,
  pattern: RegExp,
  kind: RedactionKind,
  found: RedactionKind[],
): string {
  // .test() กับแฟลก g จะจำตำแหน่งข้ามการเรียกแล้วพลาดนัดถัดไป
  // เทียบผลลัพธ์ก่อน-หลังแทน จึงไม่ต้องคอยรีเซ็ต lastIndex เอง
  const next = text.replace(pattern, PLACEHOLDER);
  if (next !== text) found.push(kind);
  return next;
}

/**
 * ตัดข้อมูลระบุตัวตนออกจากข้อความของเด็กก่อนส่งออกนอกเครื่อง
 *
 * สิ่งที่ "ไม่" ตัด: ชื่อเล่น เพราะ "My name is Mali" คือประโยคเป้าหมายของ
 * บทเรียนแรก ๆ ถ้าตัดชื่อ เด็กจะฝึกแนะนำตัวไม่ได้ ซึ่งทำลายบทเรียนทั้งบท
 * เพื่อแลกกับการปิดบังข้อมูลที่เสี่ยงต่ำกว่าเบอร์โทรมาก
 */
export function screenChildMessage(input: string): ScreenedMessage {
  const found: RedactionKind[] = [];

  let text = redact(input, URL, "url", found);
  text = redact(text, EMAIL, "email", found);

  const numbers = text.match(LONG_NUMBER);
  if (numbers) {
    // 13 หลักขึ้นไปน่าจะเป็นเลขประจำตัว สั้นกว่านั้นน่าจะเป็นเบอร์โทร
    const digitsOnly = numbers.map((value) => value.replace(/\D/g, ""));
    found.push(digitsOnly.some((value) => value.length >= 13) ? "id" : "phone");
    text = text.replace(LONG_NUMBER, PLACEHOLDER);
  }

  return { text: text.trim(), found };
}

/** บอกเด็กว่าทำไมข้อความถึงถูกตัด — บอกเหตุผล ไม่ใช่ดุ */
export function redactionNotice(found: RedactionKind[]): string | null {
  if (found.length === 0) return null;

  const what: Record<RedactionKind, string> = {
    phone: "เบอร์โทร",
    id: "เลขประจำตัว",
    email: "อีเมล",
    url: "ลิงก์",
  };

  const list = [...new Set(found)].map((kind) => what[kind]).join(" และ ");
  return `Milo ไม่เก็บ${list}นะ เราเลยตัดออกให้แล้ว คุยเรื่องอื่นกันต่อเลย!`;
}

/**
 * เทิร์นต่อวันต่อหนึ่งเครื่อง
 *
 * มีสองเหตุผล ไม่ใช่แค่เรื่องเงิน:
 * 1. ทุกเทิร์นคือโควตาจริงของผู้ให้บริการ เด็กคนเดียวที่เปิดทิ้งไว้ทั้งบ่าย
 *    ทำให้โควตาฟรีหมดได้ง่ายมาก แล้วเด็กคนอื่นจะคุยไม่ได้เลย
 * 2. แอปนี้ตั้งใจให้เซสชันละ 3–7 นาที การคุยกับ AI ยาวไม่จำกัดขัดกับเป้าหมาย
 *    นั้นเอง และไม่ใช่สิ่งที่ดีกับเด็กเล็ก
 */
export const DAILY_TURN_LIMIT = 40;

export type TurnBudget = {
  /** วันที่ของโควตาก้อนนี้ รูปแบบ YYYY-MM-DD ตามเวลาท้องถิ่น */
  date: string;
  used: number;
};

/**
 * นับเทิร์นแบบหน้าต่างรายวัน
 *
 * เป็นฟังก์ชันบริสุทธิ์ ส่วนที่เก็บสถานะอยู่ใน API route เพราะยังไม่มีฐานข้อมูล
 * ตั้งใจนับฝั่งเซิร์ฟเวอร์ไม่ใช่ใน localStorage เพราะตัวนับที่อยู่ในเครื่อง
 * ผู้ใช้แก้เองได้ จึงกันโควตาไม่ได้จริง (ดู docs/TASKS.md ภารกิจ T217 และ E6)
 */
export function spendTurn(
  budget: TurnBudget | undefined,
  today: string,
  limit = DAILY_TURN_LIMIT,
): { budget: TurnBudget; allowed: boolean; remaining: number } {
  const current =
    budget && budget.date === today ? budget : { date: today, used: 0 };

  if (current.used >= limit) {
    return { budget: current, allowed: false, remaining: 0 };
  }

  const next = { date: today, used: current.used + 1 };
  return { budget: next, allowed: true, remaining: limit - next.used };
}
