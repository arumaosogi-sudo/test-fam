"use client";

import { Delete } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  answerSlots,
  letterSlotPositions,
  letterTiles,
} from "@/lib/games/spelling";
import { seededRandom } from "@/lib/random";
import { cn } from "@/lib/utils";

type LetterTilesProps = {
  /** คำตอบที่ถูกต้อง ใช้กำหนดจำนวนช่องและชุดตัวอักษรที่ให้เลือก */
  answer: string;
  /** seed ให้ลำดับตัวอักษรคงที่ ไม่สลับใหม่ทุกครั้งที่ React วาดซ้ำ */
  seed: string;
  disabled?: boolean;
  onSubmit: (value: string) => void;
};

/**
 * ต่อตัวอักษรให้เป็นคำ — ใช้ในเกมเติมคำระดับกลาง และเกมดูภาพแบบสะกดคำ
 *
 * ทำไมไม่ให้พิมพ์: เด็กประถมต้นหลายคนยังหาปุ่มบนคีย์บอร์ดไม่ทัน การต่อ
 * ตัวอักษรจึงวัด "รู้ว่าคำนี้สะกดยังไง" ได้โดยไม่ติดปัญหาการใช้คีย์บอร์ด
 * และเห็นคำที่กำลังสร้างเต็มตาตลอดเวลา
 *
 * มีปุ่มตรวจคำตอบแยก ไม่ส่งอัตโนมัติตอนเติมครบ เพราะถ้าส่งเองทันที
 * เด็กที่วางตัวอักษรตัวสุดท้ายผิดจะไม่มีโอกาสแก้เลย
 */
export function LetterTiles({
  answer,
  seed,
  disabled = false,
  onSubmit,
}: LetterTilesProps) {
  const slots = useMemo(() => answerSlots(answer), [answer]);
  const tiles = useMemo(
    () => letterTiles(answer, seededRandom(seed)),
    [answer, seed],
  );

  const letterSlotCount = slots.filter((slot) => slot.kind === "letter").length;

  const letterPositions = useMemo(() => letterSlotPositions(slots), [slots]);

  /** ช่องที่ i ใช้ตัวอักษรใบไหน (index ของ tiles) — null คือยังว่าง */
  const [assignment, setAssignment] = useState<(number | null)[]>(() =>
    Array.from({ length: letterSlotCount }, () => null),
  );

  const usedTiles = new Set(
    assignment.filter((value): value is number => value !== null),
  );
  const filledCount = usedTiles.size;
  const complete = filledCount === letterSlotCount;

  function placeTile(tileIndex: number) {
    if (disabled || usedTiles.has(tileIndex)) return;

    const target = assignment.indexOf(null);
    if (target === -1) return;

    const next = [...assignment];
    next[target] = tileIndex;
    setAssignment(next);
  }

  function clearSlot(slotIndex: number) {
    if (disabled || assignment[slotIndex] === null) return;

    const next = [...assignment];
    next[slotIndex] = null;
    setAssignment(next);
  }

  function removeLast() {
    if (disabled) return;

    for (let i = assignment.length - 1; i >= 0; i -= 1) {
      if (assignment[i] !== null) {
        clearSlot(i);
        return;
      }
    }
  }

  /** ประกอบคำจากช่องทั้งหมด เติมช่องว่างระหว่างคำกลับเข้าไปให้เอง */
  function assemble(): string {
    return slots
      .map((slot, index) => {
        const position = letterPositions[index];
        if (slot.kind === "space" || position === null) return " ";
        const tileIndex = assignment[position];
        return tileIndex === null ? "" : tiles[tileIndex];
      })
      .join("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {slots.map((slot, slotIndex) => {
          const position = letterPositions[slotIndex];

          if (slot.kind === "space" || position === null) {
            return <span key={`gap-${slotIndex}`} className="w-4" aria-hidden />;
          }

          const tileIndex = assignment[position];
          const letter = tileIndex === null ? "" : tiles[tileIndex];

          return (
            <button
              key={`slot-${slotIndex}`}
              type="button"
              onClick={() => clearSlot(position)}
              disabled={disabled || tileIndex === null}
              aria-label={
                letter
                  ? `ช่องที่ ${position + 1} คือ ${letter} — แตะเพื่อเอาออก`
                  : `ช่องที่ ${position + 1} ยังว่าง`
              }
              className={cn(
                "rounded-tile flex size-13 items-center justify-center border-2 text-kid-xl font-extrabold uppercase transition-colors",
                letter
                  ? "bg-primary-soft border-primary text-ink"
                  : "bg-surface-2 border-border border-dashed text-ink-muted",
              )}
            >
              {letter}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {tiles.map((letter, tileIndex) => (
          <button
            key={`tile-${tileIndex}`}
            type="button"
            onClick={() => placeTile(tileIndex)}
            disabled={disabled || usedTiles.has(tileIndex)}
            aria-label={`ตัวอักษร ${letter}`}
            className={cn(
              "pressable active:pressable-sunk rounded-tile [--edge:var(--border)] bg-surface border-border text-ink flex size-13 items-center justify-center border-2 text-kid-xl font-extrabold uppercase",
              usedTiles.has(tileIndex) && "invisible",
            )}
          >
            {letter}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          variant="neutral"
          size="md"
          square
          onClick={removeLast}
          disabled={disabled || filledCount === 0}
          aria-label="ลบตัวอักษรตัวล่าสุด"
        >
          <Delete className="size-6" strokeWidth={2.75} aria-hidden />
        </Button>
        <Button
          size="md"
          variant="accent"
          className="flex-1"
          disabled={disabled || !complete}
          onClick={() => onSubmit(assemble())}
        >
          ตรวจคำตอบ
        </Button>
      </div>
    </div>
  );
}
