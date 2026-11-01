/**
 * กรองข้อมูลส่วนตัวออกจากข้อความของเด็ก "ก่อน" ส่งออกไปหาผู้ให้บริการ AI
 *
 * ทำไมต้องกรองฝั่งเรา ทั้งที่ system prompt สั่ง AI ไม่ให้ถามอยู่แล้ว:
 * เพราะ prompt คุมได้แค่สิ่งที่ AI ถาม คุมไม่ได้ว่าเด็กจะพิมพ์อะไรมาเอง
 * และเมื่อข้อความออกจากเครื่องเราไปแล้ว เราเอากลับไม่ได้ ชั้นนี้จึงเป็น
 * ด่านสุดท้ายที่เรายังควบคุมได้จริง (ดู docs/PLAN.md หัวข้อ 12 เรื่อง PDPA)
 *
 * สิ่งที่กรอง: เบอร์โทร เลขประจำตัว อีเมล และลิงก์ — เป็นตัวระบุตัวบุคคล
 * ที่ไม่มีเหตุผลทางการเรียนที่ต้องส่งออกไปเลย
 *
 * สิ่งที่ "ไม่" กรอง: ชื่อเล่น เพราะ "My name is Mali" คือประโยคเป้าหมาย
 * ของบทเรียนแรก ๆ ถ้ากรองชื่อ เด็กจะฝึกแนะนำตัวไม่ได้ ซึ่งทำลายบทเรียน
 * เพื่อแลกกับการปิดบังข้อมูลที่เสี่ยงต่ำกว่าเบอร์โทรมาก
 */

export type RedactionKind = "phone" | "id" | "email" | "url";

export type ScreenedMessage = {
  /** ข้อความที่ปลอดภัยพอจะส่งออกไปได้ */
  text: string;
  /** พบอะไรบ้าง — ใช้เตือนเด็กและแจ้งผู้ปกครอง */
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

export function screenChildMessage(input: string): ScreenedMessage {
  const found: RedactionKind[] = [];
  let text = input;

  if (URL.test(text)) found.push("url");
  text = text.replace(URL, PLACEHOLDER);

  if (EMAIL.test(text)) found.push("email");
  text = text.replace(EMAIL, PLACEHOLDER);

  const numbers = text.match(LONG_NUMBER);
  if (numbers) {
    // เลข 13 หลักขึ้นไปน่าจะเป็นเลขประจำตัว สั้นกว่านั้นน่าจะเป็นเบอร์โทร
    const digitsOnly = numbers.map((value) => value.replace(/\D/g, ""));
    found.push(digitsOnly.some((value) => value.length >= 13) ? "id" : "phone");
    text = text.replace(LONG_NUMBER, PLACEHOLDER);
  }

  // รีเซ็ต lastIndex เพราะ regex ที่มีแฟลก g จำตำแหน่งข้ามการเรียก
  URL.lastIndex = 0;
  EMAIL.lastIndex = 0;
  LONG_NUMBER.lastIndex = 0;

  return { text: text.trim(), found };
}

/** ข้อความเตือนเด็กเมื่อระบบตัดข้อมูลออก — บอกเหตุผล ไม่ใช่ดุ */
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

/** ข้อความที่เด็กควรเห็นเมื่อ AI ยกธงความปลอดภัย */
export function concernNoticeTh(): string {
  return "ถ้ามีเรื่องไม่สบายใจ ลองเล่าให้คุณพ่อคุณแม่หรือคุณครูฟังนะ เขาช่วยเราได้";
}
