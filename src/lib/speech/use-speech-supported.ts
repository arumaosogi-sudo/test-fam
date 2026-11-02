"use client";

import { useSyncExternalStore } from "react";

import { getRecognizer } from "./index";

/** ความรองรับของเบราว์เซอร์ไม่เปลี่ยนระหว่างใช้งาน จึงไม่ต้อง subscribe อะไร */
const noopSubscribe = () => () => {};

/**
 * เบราว์เซอร์นี้ถอดเสียงได้ไหม
 *
 * อ่านผ่าน useSyncExternalStore ไม่ใช่เรียกตรง ๆ ตอน render เพราะการอ่านค่า
 * จาก window ระหว่าง render เป็นผลข้างเคียงที่ React Compiler ห้ามไว้
 *
 * ค่าตอน SSR คือ "ไม่รองรับ" โดยตั้งใจ: เลือกฝั่งที่ไม่สัญญาสิ่งที่ยังไม่รู้ว่ามี
 * (ในทางปฏิบัติหน้าเกมรอโหลดความคืบหน้าก่อน จึง render บนเบราว์เซอร์เท่านั้น)
 */
export function useSpeechSupported(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => getRecognizer().isSupported(),
    () => false,
  );
}
