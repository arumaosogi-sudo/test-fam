"use client";

import { Button } from "@/components/ui/button";
import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { getWord } from "@/lib/content";
import { useSpeechSupported } from "@/lib/speech/use-speech-supported";
import type { AttemptDraft, Item, Word } from "@/lib/types";

import { ClozeGame } from "./cloze-game";
import { ListenGame } from "./listen-game";
import { MatchGame } from "./match-game";
import { PictureGame } from "./picture-game";
import { SayGame } from "./say-game";

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
  const speechSupported = useSpeechSupported();

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

  /**
   * โหมดพูดเล่นได้เฉพาะเบราว์เซอร์ที่ถอดเสียงได้ (Firefox ยังไม่รองรับ)
   *
   * เช็คตรงนี้ไม่ใช่ตอนสร้างรายการข้อ เพราะตอนสร้างรายการเรายังไม่รู้ว่า
   * เบราว์เซอร์ไหนจะเปิด และข้อที่สร้างไว้ถูกเก็บลงความคืบหน้าของเด็กด้วย
   * เครื่องที่พูดไม่ได้จะตกไปเล่นโหมดอื่นของคำเดิม ดีกว่าเจอจอที่กดอะไรไม่ได้
   */
  if (item.kind === "say" && speechSupported) {
    return <SayGame word={word} onComplete={onComplete} />;
  }

  // เกมดูภาพต้องมีภาพ ปกติ buildItems กรองให้แล้ว อันนี้กันข้อมูลเก่าใน store
  if (item.kind === "picture" && word.image) {
    return (
      <PictureGame
        itemId={item.id}
        word={word}
        variant={item.variant}
        onComplete={onComplete}
      />
    );
  }

  // มาถึงตรงนี้คือข้อเติมคำ ข้อดูภาพของคำที่ไม่มีภาพ หรือข้อพูดบนเครื่องที่พูดไม่ได้
  // คำที่ไม่มีทั้งภาพและประโยคเหลือแค่ให้ฟังเสียง ดีกว่าจอว่าง
  if (!word.sentence) {
    return <ListenGame itemId={item.id} word={word} onComplete={onComplete} />;
  }

  return (
    <ClozeGame
      itemId={item.id}
      word={{ ...word, sentence: word.sentence }}
      level={item.kind === "cloze" ? item.level : "bank"}
      onComplete={onComplete}
    />
  );
}
