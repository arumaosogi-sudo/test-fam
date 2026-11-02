"use client";

import { useEffect, useRef, useState } from "react";

import { ChoiceTile } from "@/components/ui/choice-tile";
import { MicButton } from "@/components/ui/mic-button";
import { SpeakerButton } from "@/components/ui/speaker-button";
import { Button } from "@/components/ui/button";
import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";
import {
  bankWordIdFor,
  displayTokens,
  splitWords,
} from "@/lib/content/readings";
import { starsFromAccuracy } from "@/lib/progress/xp";
import {
  getRecognizer,
  paceLabel,
  scoreReading,
  type ListenFailure,
  type ListenHandle,
  type ReadAloudScore,
} from "@/lib/speech";
import { alignReading } from "@/lib/speech/read-aloud";
import type { AttemptDraft, Reading } from "@/lib/types";
import { cn } from "@/lib/utils";

/** เรื่องยาวกว่าคำเดียวมาก ต้องให้เวลาอ่านจบโดยไม่ถูกตัด */
const READING_TIMEOUT_MS = 120_000;

const FAILURE_MESSAGE: Record<ListenFailure, string> = {
  "no-speech": "ยังไม่ได้ยินเสียงเลย ลองอ่านดัง ๆ อีกครั้งนะ",
  "not-allowed": "เบราว์เซอร์ยังไม่ได้อนุญาตให้ใช้ไมโครโฟน",
  "audio-capture": "เปิดไมโครโฟนไม่ได้ ลองเช็คว่ามีโปรแกรมอื่นใช้อยู่ไหม",
  network: "ต่อเน็ตไม่ได้ การตรวจเสียงต้องใช้อินเทอร์เน็ต",
  aborted: "หยุดกลางทาง ลองอ่านอีกครั้งได้เลย",
  unknown: "ตรวจเสียงไม่สำเร็จ ลองอีกครั้งนะ",
};

type ReadAloudGameProps = {
  reading: Reading;
  onFinish: (attempts: AttemptDraft[], score: ReadAloudScore) => void;
};

/**
 * อ่านออกเสียง (G6)
 *
 * **ขอบเขตที่เครื่องมือยอมให้ทำ** (ดู ADR-0008): ตัวถอดเสียงของเบราว์เซอร์
 * ไม่ให้เวลาของแต่ละคำ จึงวัดความแม่นได้จริง วัดความเร็วได้เป็นค่าเฉลี่ย
 * ทั้งเรื่อง แต่บอกไม่ได้ว่าเด็กติดขัดตรงคำไหน
 *
 * ไฮไลต์ตามที่อ่านใช้ข้อความระหว่างทางจากตัวถอดเสียง ไม่ใช่ตัวจับเวลา
 * จึงเดินตามเด็กจริง ไม่ใช่วิ่งไปตามจังหวะที่เราเดาไว้ล่วงหน้า
 * และเดินหน้าอย่างเดียว เพราะตัวถอดเสียงแก้ข้อความที่เดาไว้ก่อนหน้าได้
 */
export function ReadAloudGame({ reading, onFinish }: ReadAloudGameProps) {
  const words = reading.sentences.flatMap(splitWords);

  const [listening, setListening] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [failure, setFailure] = useState<ListenFailure | null>(null);
  const [score, setScore] = useState<ReadAloudScore | null>(null);
  const [answered, setAnswered] = useState<number | null>(null);

  const handleRef = useRef<ListenHandle | null>(null);
  /** เวลาที่เด็กเริ่มเปล่งเสียง ไม่ใช่ตอนกดปุ่ม — ไม่ได้ใช้ตอน render */
  const spokeAtRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      handleRef.current?.abort();
      handleRef.current = null;
    };
  }, []);

  function start() {
    if (listening || score) return;

    setFailure(null);
    setCursor(0);
    spokeAtRef.current = null;
    setListening(true);

    handleRef.current = getRecognizer().listen({
      continuous: true,
      timeoutMs: READING_TIMEOUT_MS,
      onSpeechStart: () => {
        spokeAtRef.current = performance.now();
      },
      onInterim: (text) => {
        /**
         * ไฮไลต์เดินหน้าอย่างเดียว ใช้ Math.max กับค่าก่อนหน้า
         * เพราะตัวถอดเสียงแก้ข้อความที่เดาไว้ได้ ถ้าปล่อยให้ตามตรง ๆ
         * ไฮไลต์จะกระโดดถอยหลังระหว่างที่เด็กกำลังอ่าน
         */
        const progress = alignReading(words, splitWords(text));
        setCursor((previous) => Math.max(previous, progress.cursor));
      },
      onDone: (outcome) => {
        setListening(false);
        handleRef.current = null;

        if (outcome.kind === "failed") {
          // อ่านไม่สำเร็จไม่ใช่อ่านผิด — ไม่บันทึกคะแนน ให้ลองใหม่
          setFailure(outcome.reason);
          setCursor(0);
          return;
        }

        const elapsed =
          spokeAtRef.current === null
            ? 0
            : performance.now() - spokeAtRef.current;

        const result = scoreReading(
          words,
          splitWords(outcome.heard.alternatives[0] ?? ""),
          elapsed,
        );

        setCursor(result.cursor);
        setScore(result);
      },
    });
  }

  function stop() {
    handleRef.current?.stop();
  }

  /**
   * ป้อนผลกลับเข้าระบบความชำนาญ — **หนึ่งครั้งต่อหนึ่งคำ ไม่ใช่ต่อหนึ่งครั้งที่โผล่**
   *
   * นับเฉพาะคำที่อยู่ในคลังคำ คำไวยากรณ์อย่าง "the" ไม่มีการ์ดให้บันทึก
   * ทักษะที่บันทึกคือ `speak` ซึ่งตรงกับที่เกมพูด (G5) วัดอยู่แล้ว
   * เพราะทั้งสองโหมดมีคำอังกฤษอยู่บนจอให้เห็นแล้วให้เด็กเปล่งเสียงออกมา
   *
   * เหตุผลที่ไม่นับทุกครั้งที่คำโผล่: เรื่อง "My Cat" มีคำ cat สามครั้ง
   * การอ่านคำเดียวกันสามครั้งในหนึ่งนาทีไม่ใช่การระลึกสามครั้งที่เป็นอิสระกัน
   * ซึ่งเป็นสมมติฐานที่ FSRS ใช้คิดวันนัดครั้งถัดไป ถ้านับทั้งสามครั้ง
   * วันนัดของคำนั้นจะถูกเลื่อนออกไปไกลเกินจริง แล้วเด็กจะลืมก่อนถึงกำหนด
   * (และ XP ของโหมดนี้จะพุ่งเกินโหมดอื่นโดยไม่มีเหตุผล)
   *
   * คำที่โผล่หลายครั้งถือว่า "อ่านตรง" เมื่อ**ไม่มีครั้งไหนที่พลาดเลย**
   * เพราะคำที่อ่านถูกสองครั้งแต่พลาดหนึ่งครั้ง คือคำที่ยังไม่แน่น
   */
  function finish(result: ReadAloudScore) {
    const missedIds = new Set(
      result.missed
        .map((word) => bankWordIdFor(word))
        .filter((id): id is string => id !== undefined),
    );

    /** เวลาเฉลี่ยต่อคำ เพราะไม่มีเวลาของแต่ละคำให้ใช้ */
    const latencyMs =
      result.wcpm && result.wcpm > 0 ? Math.round(60_000 / result.wcpm) : 0;

    const seen = new Set<string>();
    const attempts: AttemptDraft[] = [];

    for (const word of words) {
      const wordId = bankWordIdFor(word);
      if (!wordId || seen.has(wordId)) continue;
      seen.add(wordId);

      attempts.push({
        wordId,
        skill: "speak",
        correct: !missedIds.has(wordId),
        latencyMs,
      });
    }

    onFinish(attempts, result);
  }

  const stars = score ? starsFromAccuracy(score.accuracy) : 0;

  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <h1 className="text-kid-xl font-extrabold">{reading.titleEn}</h1>
        <p className="text-ink-muted text-kid-sm font-bold">
          {reading.titleTh}
        </p>
      </div>

      {/* เนื้อเรื่อง ไฮไลต์ทีละคำตามที่อ่านไปถึง */}
      <div className="bg-surface-2 rounded-card border-border space-y-3 border-2 p-4">
        {reading.sentences.map((sentence, sentenceIndex) => {
          const before = reading.sentences
            .slice(0, sentenceIndex)
            .reduce((sum, earlier) => sum + splitWords(earlier).length, 0);

          return (
            <div key={sentence} className="flex items-start gap-2">
              <p className="text-kid-lg min-w-0 flex-1 font-bold leading-relaxed">
                {displayTokens(sentence, before).map((token, index) => {
                  const position = token.wordIndex;
                  const read = position !== null && position < cursor;
                  const current = position === cursor && listening;

                  return (
                    <span
                      key={`${index}-${token.text}`}
                      className={cn(
                        "rounded px-0.5",
                        read && "bg-success-soft text-success-edge",
                        current && "bg-accent text-accent-ink",
                      )}
                    >
                      {token.text}{" "}
                    </span>
                  );
                })}
              </p>
              {/* ฟังเสียงต้นแบบทีละประโยค เด็กที่ยังอ่านไม่ออกต้องได้ยินก่อน */}
              <SpeakerButton text={sentence} size="sm" />
            </div>
          );
        })}
      </div>

      {!score ? (
        <div className="flex flex-col items-center gap-3">
          <MicButton listening={listening} onStart={start} onStop={stop} />
          <p className="text-ink-muted text-kid-sm text-center font-bold">
            {listening
              ? "กำลังฟัง… อ่านให้จบแล้วกดสี่เหลี่ยม"
              : "กดไมโครโฟนแล้วอ่านออกเสียงทั้งเรื่อง"}
          </p>
          {failure ? (
            <p
              role="status"
              aria-live="polite"
              className="bg-surface-2 border-border rounded-card text-kid-sm border-2 p-3 text-center font-bold"
            >
              {FAILURE_MESSAGE[failure]}
            </p>
          ) : null}
        </div>
      ) : null}

      {score ? (
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>อ่านจบแล้ว!</CardTitle>
            <StarRating value={stars} size="md" animate />
          </div>

          <div className="flex justify-between font-bold">
            <span>อ่านตรง</span>
            <span>
              {score.matched}/{score.total} คำ
            </span>
          </div>
          <div className="flex justify-between font-bold">
            <span>ความเร็ว</span>
            <span>
              {score.wcpm === null ? "—" : `${score.wcpm} คำ/นาที`}
            </span>
          </div>
          <CardNote>{paceLabel(score.wcpm)}</CardNote>

          {score.missed.length > 0 ? (
            <div className="space-y-1">
              <p className="text-kid-sm font-extrabold">
                คำที่ยังไม่ตรง ลองฟังแล้วอ่านตามอีกครั้ง
              </p>
              <div className="flex flex-wrap gap-2">
                {[...new Set(score.missed)].slice(0, 12).map((word) => (
                  <span
                    key={word}
                    className="bg-surface-1 border-border text-kid-sm inline-flex items-center gap-1 rounded-full border-2 px-2 py-1 font-bold"
                  >
                    {word}
                    <SpeakerButton text={word} size="sm" className="size-8" />
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/*
            บอกข้อจำกัดตรง ๆ ตรงจุดที่เด็กและผู้ปกครองอ่านตัวเลข
            ไม่ใช่ซ่อนไว้ในเอกสารที่ไม่มีใครเปิด
          */}
          <CardNote>
            ความเร็วเป็นค่าเฉลี่ยทั้งเรื่อง ระบบยังบอกไม่ได้ว่าติดขัดตรงคำไหน
          </CardNote>
        </Card>
      ) : null}

      {/* คำถามท้ายเรื่อง — ถามหลังอ่านจบ เพราะวัดความเข้าใจ ไม่ใช่การอ่านออกเสียง */}
      {score ? (
        <Card className="space-y-3">
          <CardTitle>{reading.question.promptTh}</CardTitle>
          <div className="grid gap-2">
            {reading.question.choicesTh.map((choice, index) => (
              <ChoiceTile
                key={choice}
                label={choice}
                className="min-h-14 flex-row"
                state={
                  answered === null
                    ? "idle"
                    : index === reading.question.answerIndex
                      ? "correct"
                      : index === answered
                        ? "wrong"
                        : "idle"
                }
                disabled={answered !== null}
                onClick={() => setAnswered(index)}
              />
            ))}
          </div>
          {answered !== null ? (
            <>
              {/*
                คำถามท้ายเรื่องไม่ถูกป้อนเข้าระบบความชำนาญ
                เพราะความเข้าใจเรื่องไม่ผูกกับคำศัพท์คำใดคำเดียว
                จึงไม่มีการ์ดไหนที่ควรขยับจากคำตอบข้อนี้
              */}
              <CardNote>
                {answered === reading.question.answerIndex
                  ? "ตอบถูก! เข้าใจเรื่องที่อ่าน"
                  : "ยังไม่ถูก ลองอ่านเรื่องอีกครั้งแล้วดูคำตอบที่ถูก"}
              </CardNote>
              <Button
                size="lg"
                variant="accent"
                onClick={() => finish(score)}
                className="w-full"
                autoFocus
              >
                จบเรื่องนี้
              </Button>
            </>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
