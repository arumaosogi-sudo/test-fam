import { CEFR_ORDER, type CefrLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * บันไดระดับภาษาของแอป — ไต่ได้ถึง C1 ไม่มีเพดาน (ดู docs/PLAN.md ข้อ 1)
 * รายการจริงอยู่ใน lib/types.ts ที่นี่แค่ re-export ให้หน้าที่ใช้ป้ายเรียกง่าย
 */
export const CEFR_LEVELS = CEFR_ORDER;

/** ช่วงชั้นที่ "ตั้งเป้าไว้" ของแต่ละระดับ ใช้อธิบายให้ผู้ปกครองเข้าใจ */
export const CEFR_GRADE_LABEL: Record<CefrLevel, string> = {
  "Pre-A1": "อนุบาล",
  A1: "ป.1–2",
  A2: "ป.3–4",
  B1: "ป.5–6",
  B2: "ต่อยอด",
  C1: "ต่อยอด",
};

/**
 * พื้นหลังแบบ *-soft ต้องคู่กับ text-ink เสมอ ห้ามใช้ *-ink
 *
 * เพราะ *-ink คือสีตัวอักษรสำหรับวางบนพื้น "สีเข้ม" ของ token นั้น
 * ส่วน *-soft เป็นพื้นอ่อนในธีมสว่างและพื้นเข้มในธีมมืด ซึ่ง text-ink
 * พลิกตามธีมให้พอดีอยู่แล้ว (เคยพลาดจุดนี้จนป้ายในธีมมืดอ่านไม่ออก)
 */
const levelTone: Record<CefrLevel, string> = {
  "Pre-A1": "bg-accent-soft text-ink border-accent",
  A1: "bg-primary-soft text-ink border-primary",
  A2: "bg-success-soft text-ink border-success",
  B1: "bg-warn-soft text-ink border-warn",
  B2: "bg-surface-2 text-ink border-border",
  C1: "bg-ink text-bg border-ink",
};

type LevelBadgeProps = {
  level: CefrLevel;
  /** แสดงช่วงชั้นต่อท้าย เช่น "A1 · ป.1–2" */
  withGrade?: boolean;
  className?: string;
};

export function LevelBadge({
  level,
  withGrade = false,
  className,
}: LevelBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-pill text-kid-sm inline-flex items-center gap-1.5 border-2 px-3 py-1 font-extrabold",
        levelTone[level],
        className,
      )}
    >
      {level}
      {withGrade ? (
        <span className="font-bold opacity-75">· {CEFR_GRADE_LABEL[level]}</span>
      ) : null}
    </span>
  );
}
