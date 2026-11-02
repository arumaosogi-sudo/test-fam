import type { ClozeLevel, Item, PictureVariant, Skill } from "@/lib/types";

/**
 * หน้าจอหนึ่งฝึกทักษะอะไร — ที่เดียวที่ตัดสินเรื่องนี้
 *
 * ผูกกับโหมดย่อยไม่ใช่แค่ชื่อโหมด เพราะโหมดเดียวกันฝึกคนละทักษะได้:
 * "ดูภาพแล้วเลือกคำ" คือการจำคำได้ (recognize) แต่ "ดูภาพแล้วสะกดคำ"
 * คือการเขียน (write) ถ้าแยกไม่ออก ดาวความชำนาญจะเพิ่มผิดช่อง
 * แล้วระบบจะคิดว่าเด็กเขียนได้ทั้งที่แค่จำหน้าตาคำได้
 */

export function skillForPictureVariant(variant: PictureVariant): Skill {
  return variant === "spell" ? "write" : "recognize";
}

export function skillForClozeLevel(level: ClozeLevel): Skill {
  // เลือกจากคลังคำคือการอ่านประโยคแล้วเลือกคำที่เข้ากับบริบท ยังไม่ใช่การเขียน
  return level === "bank" ? "recognize" : "write";
}

export function skillForItem(item: Item): Skill {
  switch (item.kind) {
    case "match":
      return "recognize";
    case "listen":
      return "listen";
    case "say":
      return "speak";
    case "picture":
      return skillForPictureVariant(item.variant);
    case "cloze":
      return skillForClozeLevel(item.level);
  }
}
