"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * เวลาที่เด็กใช้ตอบหนึ่งข้อ นับจากตอนข้อนั้นขึ้นจอจนถึงตอนกดตอบ
 *
 * ค่านี้ถูกส่งต่อให้ FSRS ใช้ตัดสินว่าเด็ก "ตอบได้ทันที" หรือ "นึกนาน"
 * ซึ่งมีผลต่อวันนัดทบทวนครั้งถัดไป (ดู ratingFromAttempt)
 *
 * ที่ต้องมีฮุกนี้แทนการเรียกนาฬิกาในตัวเกม: การอ่านเวลาปัจจุบันตอน render
 * ทำให้ผลลัพธ์ของ component ไม่คงที่ React Compiler จึงห้ามไว้ ฮุกนี้อ่านเวลา
 * ใน effect กับใน event handler ซึ่งเป็นจังหวะที่อ่านได้ และเป็นที่เดียว
 * ในชั้น component ที่แตะนาฬิกา
 */
export function useItemTimer() {
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = performance.now();
  }, []);

  return useCallback(
    () => Math.max(0, Math.round(performance.now() - startedAt.current)),
    [],
  );
}
