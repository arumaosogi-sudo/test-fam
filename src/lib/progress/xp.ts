import type { Profile } from "@/lib/types";

/**
 * XP ระดับ และไฟต่อเนื่อง (streak)
 *
 * หมายเหตุการออกแบบ: เราตั้งใจไม่ทำระบบหัวใจที่บังคับให้รอหรือจ่ายเงิน
 * และทำ streak ให้ "ใจดี" กว่าแอปผู้ใหญ่ เพราะเด็กไม่ควรเสียใจ
 * เพราะพลาดไปวันเดียว (ดู docs/PLAN.md หัวข้อ 5)
 */

export const XP_PER_CORRECT = 10;
export const XP_PERFECT_BONUS = 20;
export const XP_FIRST_CLEAR_BONUS = 15;

/** ตั๋วกันไฟดับที่เติมให้ทุกเดือน */
export const MONTHLY_STREAK_FREEZES = 2;

/** XP ที่ต้องใช้เพื่อขึ้นถึงเลเวล n (เลเวลเริ่มที่ 1) */
export function xpForLevel(level: number) {
  const target = Math.max(1, Math.floor(level));
  return 50 * (target - 1) * (target - 1);
}

export function levelFromXp(xp: number) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
}

/** ความคืบหน้าภายในเลเวลปัจจุบัน ใช้วาดแถบ */
export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const floorXp = xpForLevel(level);
  const ceilXp = xpForLevel(level + 1);

  return {
    level,
    current: xp - floorXp,
    needed: ceilXp - floorXp,
  };
}

export type LessonScore = {
  correctCount: number;
  totalCount: number;
  isFirstClear: boolean;
};

export function lessonXp({
  correctCount,
  totalCount,
  isFirstClear,
}: LessonScore) {
  let xp = correctCount * XP_PER_CORRECT;
  if (totalCount > 0 && correctCount === totalCount) xp += XP_PERFECT_BONUS;
  if (isFirstClear) xp += XP_FIRST_CLEAR_BONUS;
  return xp;
}

/**
 * ดาวประจำด่าน — เล่นจบย่อมได้อย่างน้อย 1 ดาวเสมอ
 * เพราะกฎข้อ 2 ของโปรเจกต์: ห้ามทำให้เด็กรู้สึกว่าความพยายามสูญเปล่า
 */
export function starsFromAccuracy(accuracy: number) {
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
}

/** วันที่ในรูปแบบ YYYY-MM-DD ตามเวลาท้องถิ่น (ไม่ใช่ UTC) */
export function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** ห่างกันกี่วัน นับแบบวันปฏิทิน ไม่สนเวลาในวัน */
export function daysBetweenKeys(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const start = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

export type StreakUpdate = {
  streakDays: number;
  lastActiveDate: string;
  streakFreezes: number;
  /** ใช้ตั๋วกันไฟดับไปหรือเปล่า ใช้บอกเด็กว่า "ไฟเกือบดับแล้วนะ" */
  usedFreeze: boolean;
};

/**
 * บันทึกว่าวันนี้เด็กมาเล่นแล้ว
 *
 * ขาดไป 1 วันแล้วมีตั๋ว จะใช้ตั๋วต่อไฟให้อัตโนมัติ
 * ขาดมากกว่านั้นหรือไม่มีตั๋ว ไฟจึงเริ่มนับใหม่
 */
export function registerActivity(
  profile: Pick<Profile, "streakDays" | "lastActiveDate" | "streakFreezes">,
  now: Date,
): StreakUpdate {
  const today = localDateKey(now);

  if (!profile.lastActiveDate) {
    return {
      streakDays: 1,
      lastActiveDate: today,
      streakFreezes: profile.streakFreezes,
      usedFreeze: false,
    };
  }

  const gap = daysBetweenKeys(profile.lastActiveDate, today);

  // เล่นซ้ำในวันเดิม หรือนาฬิกาเครื่องเพี้ยนย้อนหลัง — ไม่ต้องทำอะไร
  if (gap <= 0) {
    return {
      streakDays: profile.streakDays,
      lastActiveDate: profile.lastActiveDate,
      streakFreezes: profile.streakFreezes,
      usedFreeze: false,
    };
  }

  if (gap === 1) {
    return {
      streakDays: profile.streakDays + 1,
      lastActiveDate: today,
      streakFreezes: profile.streakFreezes,
      usedFreeze: false,
    };
  }

  if (gap === 2 && profile.streakFreezes > 0) {
    return {
      streakDays: profile.streakDays + 1,
      lastActiveDate: today,
      streakFreezes: profile.streakFreezes - 1,
      usedFreeze: true,
    };
  }

  return {
    streakDays: 1,
    lastActiveDate: today,
    streakFreezes: profile.streakFreezes,
    usedFreeze: false,
  };
}
