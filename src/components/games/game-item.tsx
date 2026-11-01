"use client";

import { Button } from "@/components/ui/button";
import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { getWord } from "@/lib/content";
import type { AttemptDraft, Item, Word } from "@/lib/types";

import { ClozeGame } from "./cloze-game";
import { ListenGame } from "./listen-game";
import { MatchGame } from "./match-game";
import { PictureGame } from "./picture-game";

type GameItemProps = {
  item: Item;
  onComplete: (attempts: AttemptDraft[]) => void;
};

/**
 * เลือก component ของเกมตามชนิดของข้อ
 *
 * ใช้ร่วมกันทั้งด่านปกติและด่านทบทวน ทุกโหมดคืนผลเป็น AttemptDraft[] รูปแบบ
 * เดียวกัน ตัวคุมลำดับข้อจึงไม่ต้องรู้ว่าข้างในเกมทำอะไร และเพิ่มโหมดใหม่ได้
 * โดยไม่ต้องแก้ทั้งสองหน้า
 */
export function GameItem({ item, onComplete }: GameItemProps) {
  if (item.kind === "match") {
    const words = item.wordIds
      .map(getWord)
      .filter((word): word is Word => word !== undefined);

    return (
      <MatchGame itemId={item.id} words={words} onComplete={onComplete} />
    );
  }

  const word = getWord(item.wordIds[0]);

  // ป้องกันคลังคำที่ถูกแก้แล้วอ้างถึงคำที่ไม่มีอยู่ — ข้ามข้อนั้นไป
  // ดีกว่าให้ทั้งด่านจอขาว และไม่บันทึกผลผิด ๆ ว่าเด็กตอบผิด
  if (!word) {
    return (
      <Card className="space-y-3 text-center">
        <CardTitle>ข้อนี้ยังไม่พร้อม</CardTitle>
        <CardNote>ไม่พบคำศัพท์ของข้อนี้ในคลังคำ</CardNote>
        <Button size="md" onClick={() => onComplete([])}>
          ข้ามไปข้อถัดไป
        </Button>
      </Card>
    );
  }

  if (item.kind === "listen") {
    return (
      <ListenGame itemId={item.id} word={word} onComplete={onComplete} />
    );
  }

  if (item.kind === "picture") {
    return (
      <PictureGame
        itemId={item.id}
        word={word}
        variant={item.variant}
        onComplete={onComplete}
      />
    );
  }

  return (
    <ClozeGame
      itemId={item.id}
      word={word}
      level={item.level}
      onComplete={onComplete}
    />
  );
}
