import { describe, expect, it } from "vitest";

import { micFailureMessage } from "./failure-message";
import type { ListenFailure } from "./types";

const ALL: ListenFailure[] = [
  "no-speech",
  "not-allowed",
  "audio-capture",
  "network",
  "aborted",
  "unknown",
];

describe("micFailureMessage", () => {
  /**
   * ด่านที่มาจากของจริง: หน้าแชทเคยโชว์คำว่า "not-allowed" ลอยอยู่กลางจอ
   * เพราะส่งรหัสของเบราว์เซอร์ไปแสดงตรง ๆ เด็กอ่านไม่รู้เรื่องว่าต้องทำอะไร
   */
  it("ทุกสาเหตุได้ประโยคไทย ไม่มีรหัสดิบหลุดออกจอ", () => {
    for (const reason of ALL) {
      const text = micFailureMessage(reason);

      expect(text.length, reason).toBeGreaterThan(10);
      expect(/[a-z-]{4,}/.test(text), `${reason}: ${text}`).toBe(false);
      expect(/[฀-๿]/.test(text), reason).toBe(true);
    }
  });

  it("ใช้คำกริยาตามกิจกรรมของหน้าจอนั้น", () => {
    expect(micFailureMessage("no-speech", "พูด")).toContain("ลองพูดดัง");
    expect(micFailureMessage("no-speech", "อ่าน")).toContain("ลองอ่านดัง");
  });

  it("สาเหตุที่ไม่เกี่ยวกับเสียงของเด็กไม่เปลี่ยนตามคำกริยา", () => {
    // เด็กไม่ได้ทำอะไรผิดตอนไมค์ถูกบล็อก ข้อความจึงไม่ควรสั่งให้ลองพูดอีก
    expect(micFailureMessage("not-allowed", "พูด")).toBe(
      micFailureMessage("not-allowed", "อ่าน"),
    );
    expect(micFailureMessage("not-allowed")).toContain("อนุญาต");
  });

  it("ค่าที่ไม่รู้จักยังได้ข้อความ ไม่ใช่ค่าว่าง", () => {
    expect(micFailureMessage("unknown")).toContain("ลองอีกครั้ง");
  });
});
