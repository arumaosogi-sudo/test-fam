import { localDateKey } from "@/lib/progress/xp";

/**
 * จำกัดจำนวนเทิร์นแชทต่อวัน (ภารกิจ T217)
 *
 * มีสองเหตุผล ไม่ใช่แค่เรื่องเงิน:
 * 1. ทุกเทิร์นคือเงินจริงที่จ่ายให้ผู้ให้บริการ AI เด็กคนเดียวที่เปิดทิ้งไว้
 *    ทั้งบ่ายทำให้บิลบานได้ง่ายมาก
 * 2. แอปนี้ตั้งใจให้เซสชันละ 3–7 นาที การคุยกับ AI ยาวไม่จำกัดขัดกับเป้าหมาย
 *    นั้นเอง และไม่ใช่สิ่งที่ดีกับเด็กเล็ก
 */

/** เทิร์นต่อวันของเด็กหนึ่งคน — ราว 15–20 นาทีของการคุย */
export const DAILY_TURN_LIMIT = 40;

export type TurnBudget = {
  /** วันที่ของตัวนับ รูปแบบ YYYY-MM-DD ตามเวลาท้องถิ่น */
  dateKey: string;
  used: number;
};

/**
 * ตัวนับเริ่มต้น — ใช้ dateKey ว่างแทนวันที่วันนี้โดยตั้งใจ
 *
 * เพราะค่าเริ่มต้นถูกสร้างตอนประกาศ store ซึ่งเป็นจังหวะที่ยังอ่านนาฬิกาไม่ได้
 * (จะทำให้ค่าฝั่งเซิร์ฟเวอร์กับฝั่งเบราว์เซอร์ไม่ตรงกัน) และ dateKey ว่าง
 * ไม่มีทางตรงกับวันไหน ตัวนับจึงรีเซ็ตเองในการใช้งานครั้งแรกอยู่แล้ว
 */
export const EMPTY_BUDGET: TurnBudget = { dateKey: "", used: 0 };

/** นับเทิร์นเพิ่มหนึ่ง และรีเซ็ตเองเมื่อข้ามวัน */
export function spendTurn(budget: TurnBudget, now: Date): TurnBudget {
  const today = localDateKey(now);
  if (budget.dateKey !== today) return { dateKey: today, used: 1 };
  return { dateKey: today, used: budget.used + 1 };
}

export function turnsLeft(budget: TurnBudget, now: Date): number {
  if (budget.dateKey !== localDateKey(now)) return DAILY_TURN_LIMIT;
  return Math.max(0, DAILY_TURN_LIMIT - budget.used);
}

export function canChat(budget: TurnBudget, now: Date): boolean {
  return turnsLeft(budget, now) > 0;
}
