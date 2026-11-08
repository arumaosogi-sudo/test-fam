"use client";

import { Lightbulb, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { MicButton } from "@/components/ui/mic-button";
import { SpeakerButton } from "@/components/ui/speaker-button";
import { WordImage } from "@/components/ui/word-image";
import {
  getRecognizer,
  getTts,
  hintsForWord,
  judgeSpoken,
  micFailureMessage,
  type ListenFailure,
  type ListenHandle,
  type RecognizerAvailability,
  type SpokenVerdict,
} from "@/lib/speech";
import type { AttemptDraft, Word } from "@/lib/types";

import { FeedbackPanel } from "./feedback-panel";
import { useItemTimer } from "./use-item-timer";

/**
 * จำนวนครั้งที่ให้พูด ก่อนจะบันทึกว่ายังทำไม่ได้
 *
 * ให้สามครั้งเพราะตัวถอดเสียงพลาดเองได้ (เสียงเด็กอยู่นอกข้อมูลที่โมเดลฝึกมา)
 * ครั้งเดียวแล้วตัดว่าผิดจะวัดความแม่นของเครื่องมากกว่าวัดเด็ก
 */
const MAX_TRIES = 3;

/**
 * ไม่มี itemId เหมือนโหมดอื่น เพราะโหมดนี้ไม่มีตัวลวงให้สุ่ม
 * จึงไม่ต้องมี seed อะไรให้คงที่ระหว่างเซิร์ฟเวอร์กับเบราว์เซอร์
 */
type SayGameProps = {
  word: Word;
  onComplete: (attempts: AttemptDraft[]) => void;
};

/**
 * พูดให้ฟัง (G5) — เด็กออกเสียงคำ แล้วระบบถอดเสียงมาเทียบกับคำเป้าหมาย
 *
 * สิ่งที่ด่านนี้วัดคือ **พูดแล้วคนอื่นฟังออกไหม** ไม่ใช่สำเนียงเหมือนเจ้าของ
 * ภาษาแค่ไหน เพราะเครื่องมือฟรีให้มาแค่ข้อความที่ถอดได้ ไม่มีคะแนนรายหน่วยเสียง
 * (ดู docs/adr/0008-speech-recognition.md) ซึ่งพอดีกับเป้าหมายของแอปที่ว่า
 * ต้องพูดจนใช้สื่อสารได้จริง — ถ้าเครื่องฟังออก คนก็มีโอกาสฟังออก
 *
 * กฎสำคัญข้อหนึ่งของด่านนี้: **ถอดเสียงไม่สำเร็จ ไม่เท่ากับเด็กพูดผิด**
 * ไมค์ถูกปฏิเสธ เน็ตหลุด หรือไม่ได้ยินเสียง จะไม่บันทึกว่าตอบผิด เพราะข้อมูล
 * ความชำนาญที่เพี้ยนจะไปกำหนดวันทบทวนและความยากของข้อผิด ๆ ต่อไปอีกนาน
 */
export function SayGame({ word, onComplete }: SayGameProps) {
  const elapsed = useItemTimer();

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [tries, setTries] = useState(0);
  const [verdict, setVerdict] = useState<SpokenVerdict | null>(null);
  const [failure, setFailure] = useState<ListenFailure | null>(null);
  const [attempt, setAttempt] = useState<AttemptDraft | null>(null);
  const [availability, setAvailability] =
    useState<RecognizerAvailability | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installing, setInstalling] = useState(false);

  /** handle ของการฟังรอบปัจจุบัน — ใช้ยกเลิกตอนออกจากหน้า ไม่ได้ใช้ตอน render */
  const handleRef = useRef<ListenHandle | null>(null);

  // ให้ฟังเสียงต้นแบบก่อนหนึ่งครั้ง เด็กต้องรู้ว่าจะเลียนเสียงอะไร
  useEffect(() => {
    void getTts().speak(word.en);
    return () => getTts().cancel();
  }, [word.en]);

  /**
   * ตั้งค่าใน callback ของ promise ไม่ใช่ในตัว effect ตรง ๆ
   * เพราะ setState ที่ยิงทันทีในตัว effect ทำให้ render ซ้อนกันเป็นลูกโซ่
   * (React Compiler ห้ามไว้) ส่วนในนี้เป็นจังหวะที่ค่าจากข้างนอกเข้ามาจริง
   */
  useEffect(() => {
    const recognizer = getRecognizer();
    void recognizer.availability().then((state) => {
      setAvailability(state);
      setCanInstall(typeof recognizer.install === "function");
    });
  }, []);

  useEffect(() => {
    return () => {
      handleRef.current?.abort();
      handleRef.current = null;
    };
  }, []);

  function record(correct: boolean) {
    setAttempt({
      wordId: word.id,
      skill: "speak",
      correct,
      latencyMs: elapsed(),
    });
  }

  function handleOutcomeHeard(result: SpokenVerdict, nextTries: number) {
    setVerdict(result);

    if (result.kind === "correct") {
      record(true);
      return;
    }

    // ยังมีสิทธิ์ลองอีก — ไม่บันทึกอะไร ให้เด็กแก้เสียงแล้วพูดใหม่
    if (nextTries < MAX_TRIES) return;

    record(false);
  }

  function startListening() {
    if (listening || attempt) return;

    setFailure(null);
    setVerdict(null);
    setInterim("");
    setListening(true);

    handleRef.current = getRecognizer().listen({
      onInterim: setInterim,
      onDone: (outcome) => {
        setListening(false);
        handleRef.current = null;

        const nextTries = tries + 1;

        if (outcome.kind === "failed") {
          /**
           * ไม่เพิ่มจำนวนครั้งที่ลอง และไม่บันทึกผล เพราะรอบนี้ไม่ได้วัดอะไรเลย
           * ถ้านับเป็นหนึ่งครั้ง เด็กที่ไมค์มีปัญหาจะหมดสิทธิ์ลองโดยไม่ได้พูด
           */
          setFailure(outcome.reason);
          return;
        }

        setTries(nextTries);
        handleOutcomeHeard(judgeSpoken(outcome.heard, word.en), nextTries);
      },
    });
  }

  function stopListening() {
    handleRef.current?.stop();
  }

  async function installLocal() {
    setInstalling(true);
    const recognizer = getRecognizer();
    await recognizer.install?.();
    setAvailability(await recognizer.availability());
    setInstalling(false);
  }

  const hints = hintsForWord(word.ipa);
  const triesLeft = MAX_TRIES - tries;
  const done = attempt !== null;

  return (
    <div className="space-y-5">
      <p className="text-kid-lg text-center font-extrabold">พูดคำนี้ให้ฟัง</p>

      <div className="bg-surface-2 rounded-card border-border flex flex-col items-center gap-2 border-2 py-5">
        {word.image ? (
          <WordImage wordId={word.id} className="size-24" />
        ) : null}
        <p className="text-kid-2xl text-ink font-extrabold">{word.en}</p>
        <p className="text-ink-muted text-kid-sm font-bold">
          {word.th} · {word.ipa}
        </p>
        <div className="flex items-center gap-2">
          <SpeakerButton text={word.en} size="sm" />
          <SpeakerButton text={word.en} slow size="sm" />
        </div>
      </div>

      {!done ? (
        <div className="flex flex-col items-center gap-3">
          <MicButton
            listening={listening}
            onStart={startListening}
            onStop={stopListening}
          />
          <p className="text-ink-muted text-kid-sm text-center font-bold">
            {listening
              ? "กำลังฟัง… พูดแล้วกดสี่เหลี่ยมเพื่อส่งตรวจ"
              : `กดไมโครโฟนแล้วพูด (เหลือ ${triesLeft} ครั้ง)`}
          </p>
          {/* โชว์สิ่งที่ระบบได้ยินระหว่างทาง เด็กจะเห็นว่าไมค์ทำงานอยู่จริง */}
          {interim ? (
            <p className="text-ink text-kid-sm font-bold">
              ได้ยินว่า: {interim}
            </p>
          ) : null}
        </div>
      ) : null}

      {failure ? (
        <p
          role="status"
          aria-live="polite"
          className="bg-surface-2 border-border rounded-card text-kid-sm border-2 p-3 text-center font-bold"
        >
          {micFailureMessage(failure, "พูด")}
        </p>
      ) : null}

      {/* เกือบถูกหรือยังไม่ถูกแต่ยังมีสิทธิ์ลอง — สอนเสียงแล้วให้พูดใหม่ */}
      {verdict && verdict.kind !== "correct" && !done ? (
        <div
          role="status"
          aria-live="polite"
          className="bg-surface-2 border-border rounded-card space-y-3 border-2 p-4"
        >
          <p className="text-ink text-kid-sm font-extrabold">
            {verdict.kind === "near"
              ? "เกือบถูกแล้ว ลองอีกครั้งนะ"
              : "ยังฟังไม่ออก ลองอีกครั้งนะ"}
          </p>
          {verdict.heard ? (
            <p className="text-ink-muted text-kid-sm font-bold">
              ระบบได้ยินว่า “{verdict.heard}”
            </p>
          ) : null}
          {hints.map((hint) => (
            <div key={hint.id} className="flex gap-2">
              <Lightbulb
                className="text-accent-edge mt-0.5 size-5 shrink-0"
                strokeWidth={2.75}
                aria-hidden
              />
              <p className="text-ink text-kid-sm font-bold">
                <span className="font-extrabold">{hint.sound}:</span> {hint.tip}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {attempt ? (
        <FeedbackPanel
          correct={attempt.correct}
          word={word}
          onNext={() => onComplete([attempt])}
        />
      ) : null}

      {/*
        บอกตรง ๆ ว่าเสียงไปไหน — นี่คือแอปเด็ก ผู้ปกครองมีสิทธิ์รู้
        และถ้าเครื่องรองรับการถอดเสียงในเครื่อง ก็ให้เลือกเปลี่ยนได้ทันที
      */}
      {availability === "on-device" ? (
        <p className="text-ink-muted text-kid-sm flex items-center justify-center gap-1.5 font-bold">
          <ShieldCheck className="size-4" strokeWidth={2.75} aria-hidden />
          ตรวจเสียงในเครื่องนี้ เสียงไม่ถูกส่งออกไปไหน
        </p>
      ) : null}

      {availability === "cloud" && !done ? (
        <div className="text-ink-muted text-kid-sm space-y-2 text-center font-bold">
          <p>เสียงจะถูกส่งไปถอดที่เซิร์ฟเวอร์ของเบราว์เซอร์</p>
          {canInstall ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={installLocal}
              disabled={installing}
            >
              {installing ? "กำลังดาวน์โหลด…" : "ให้ตรวจเสียงในเครื่องแทน"}
            </Button>
          ) : null}
        </div>
      ) : null}

      {availability === "downloading" ? (
        <p className="text-ink-muted text-kid-sm text-center font-bold">
          กำลังดาวน์โหลดชุดภาษาเพื่อตรวจเสียงในเครื่อง
        </p>
      ) : null}
    </div>
  );
}
