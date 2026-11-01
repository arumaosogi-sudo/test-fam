import { cn } from "@/lib/utils";

type WordImageProps = {
  /** รหัสคำ ใช้เป็นชื่อไฟล์ภาพโดยตรง */
  wordId: string;
  className?: string;
};

/**
 * ภาพประกอบของคำศัพท์หนึ่งคำ
 *
 * ไฟล์อยู่ใน `public/words/<id>.svg` (ดู LICENSE.md ในโฟลเดอร์นั้น)
 * การอ้างด้วยรหัสคำแทนรหัส Unicode ทำให้เปลี่ยนภาพทีหลังได้โดยไม่ต้องแก้โค้ด
 * — วางไฟล์ใหม่ทับชื่อเดิมก็พอ
 *
 * ตั้ง alt ว่างโดยตั้งใจ เพราะทุกที่ที่ใช้ภาพนี้มีข้อความกำกับอยู่แล้ว
 * (คำแปลไทยข้าง ๆ หรือ sr-only ของเกม) ถ้าใส่ alt ซ้ำ โปรแกรมอ่านหน้าจอ
 * จะอ่านสองรอบ และในเกมดูภาพเลือกคำ alt จะกลายเป็นการเฉลยคำตอบ
 */
export function WordImage({ wordId, className }: WordImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- เป็น SVG สถิตในโปรเจกต์ ไม่ต้องผ่านตัวย่อขนาดภาพ
    <img
      src={`/words/${wordId}.svg`}
      alt=""
      aria-hidden
      draggable={false}
      className={cn("size-12 shrink-0 object-contain select-none", className)}
    />
  );
}
