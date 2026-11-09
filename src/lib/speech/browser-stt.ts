import type {
  ListenFailure,
  ListenHandle,
  ListenOptions,
  RecognizerAvailability,
  SpeechRecognizer,
} from "./types";

/**
 * ถอดเสียงด้วย Web Speech API ของเบราว์เซอร์ — ฟรี ไม่ต้องมี API key
 *
 * เลือกตัวนี้เพราะทางเลือกเดียวที่ให้คะแนนระดับหน่วยเสียงได้จริงคือบริการ
 * ที่ต้องจ่ายเงินและต้องมีบัญชี ซึ่งโปรเจกต์นี้ยังไม่มี (ดู ADR-0008)
 * สิ่งที่ตัวนี้ตอบได้คือ "ระบบฟังเด็กออกว่าเป็นคำนี้ไหม" ไม่ใช่
 * "เด็กออกเสียงแต่ละหน่วยเสียงได้กี่คะแนน" — เกมจึงถูกออกแบบรอบคำถามข้อแรก
 *
 * ข้อจำกัดที่ต้องรู้:
 * - Firefox ยังไม่รองรับ (ซ่อนหลัง flag) เกมพูดจึงต้องมีทางถอยทุกที่ที่เรียกใช้
 * - บน Chrome/Safari ค่าเริ่มต้นคือส่งเสียงไปถอดที่เซิร์ฟเวอร์ ไม่ทำงานออฟไลน์
 * - ความมั่นใจ (confidence) หลายเบราว์เซอร์คืน 0 เสมอ ใช้ตัดสินไม่ได้
 */

/** ชนิดเท่าที่เราใช้จริง — ประกาศเองเพราะ lib.dom ของ TS ยังไม่มีตัวที่มี prefix */
type RecognitionAlternative = { transcript: string; confidence: number };
type RecognitionResult = {
  readonly length: number;
  isFinal: boolean;
  item(index: number): RecognitionAlternative;
  [index: number]: RecognitionAlternative;
};
type RecognitionResultList = {
  readonly length: number;
  item(index: number): RecognitionResult;
  [index: number]: RecognitionResult;
};

type RecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  processLocally?: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult:
    | ((event: { resultIndex: number; results: RecognitionResultList }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onspeechstart: (() => void) | null;
};

type AvailabilityOptions = { langs: string[]; processLocally: boolean };

type RecognitionConstructor = {
  new (): RecognitionInstance;
  available?(options: AvailabilityOptions): Promise<string>;
  install?(options: AvailabilityOptions): Promise<boolean>;
};

const DEFAULT_LANG = "en-US";

/**
 * จำนวนตัวเลือกที่ขอจากบริการถอดเสียง
 *
 * ขอ 5 ตัวเพราะเสียงเด็กไทยพูดอังกฤษอยู่นอกข้อมูลที่โมเดลพวกนี้ฝึกมา
 * คำที่ออกเสียงถูกจึงไปอยู่ตัวเลือกที่สองหรือสามได้บ่อย การดูแค่ตัวแรก
 * จะตัดว่าเด็กพูดผิดทั้งที่พูดถูก ซึ่งเป็นความผิดพลาดที่แพงที่สุดของเกมนี้
 */
const MAX_ALTERNATIVES = 5;

/**
 * กันกรณี onend ไม่ยิง — เคยเจอใน Safari ตอนไมค์ถูกโปรแกรมอื่นยึดไว้
 * ถ้าไม่มีตัวนับนี้ ปุ่มจะค้างอยู่ที่ "กำลังฟัง" ไปตลอดโดยไม่มีอะไรฟ้อง
 */
const HARD_TIMEOUT_MS = 12_000;
/** เปิดฟังต่อได้มากสุดกี่ครั้งต่อการกดไมค์หนึ่งครั้ง */
const MAX_RESTARTS = 12;

/** รหัส error จากสเปกที่เราแปลเป็นสาเหตุของเราเอง */
const FAILURE_BY_CODE: Record<string, ListenFailure> = {
  "no-speech": "no-speech",
  aborted: "aborted",
  "audio-capture": "audio-capture",
  "not-allowed": "not-allowed",
  "service-not-allowed": "not-allowed",
  network: "network",
};

function getConstructor(): RecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;

  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };

  // Safari และ Chrome รุ่นเก่ามีแต่ชื่อที่มี prefix
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
}

class BrowserRecognizer implements SpeechRecognizer {
  readonly id = "browser";

  /** ผลของ availability() ที่ถามไปแล้ว — ไม่เปลี่ยนระหว่างใช้งานหน้าเดียว */
  private localReady: boolean | null = null;

  isSupported(): boolean {
    return getConstructor() !== undefined;
  }

  async availability(lang = DEFAULT_LANG): Promise<RecognizerAvailability> {
    const Recognition = getConstructor();
    if (!Recognition) return "unsupported";

    // เบราว์เซอร์ที่ยังไม่มี available() ถอดเสียงได้ แต่ส่งออกนอกเครื่องแน่นอน
    if (typeof Recognition.available !== "function") {
      this.localReady = false;
      return "cloud";
    }

    try {
      const state = await Recognition.available({
        langs: [lang],
        processLocally: true,
      });

      this.localReady = state === "available";
      if (state === "available") return "on-device";
      if (state === "downloading") return "downloading";
      return "cloud";
    } catch {
      // ถามไม่ได้ก็ถือว่าต้องพึ่งคลาวด์ ดีกว่าบอกผู้ใช้ว่าปลอดภัยทั้งที่ไม่รู้
      this.localReady = false;
      return "cloud";
    }
  }

  async install(lang = DEFAULT_LANG): Promise<boolean> {
    const Recognition = getConstructor();
    if (!Recognition || typeof Recognition.install !== "function") return false;

    try {
      const ok = await Recognition.install({
        langs: [lang],
        processLocally: true,
      });
      if (ok) this.localReady = true;
      return ok;
    } catch {
      return false;
    }
  }

  listen({
    lang = DEFAULT_LANG,
    continuous = false,
    timeoutMs = HARD_TIMEOUT_MS,
    silenceGraceMs = 0,
    onInterim,
    onSpeechStart,
    onDone,
  }: ListenOptions): ListenHandle {
    const Recognition = getConstructor();

    if (!Recognition) {
      onDone({ kind: "failed", reason: "unknown" });
      return { stop() {}, abort() {} };
    }

    const recognition = new Recognition();
    recognition.lang = lang;
    // ข้อพูดทีละคำไม่ต้องฟังต่อเนื่อง ส่วนการอ่านทั้งเรื่องต้อง
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = MAX_ALTERNATIVES;

    /**
     * ใช้การประมวลผลในเครื่องถ้าเช็คมาแล้วว่าพร้อม
     *
     * ไม่ตั้งเป็น true ไว้ตลอดโดยไม่เช็ค เพราะถ้าชุดภาษายังไม่ถูกติดตั้ง
     * start() จะล้มด้วย language-not-supported แล้วเด็กจะพูดไม่ได้เลย
     * ทั้งที่ถอดเสียงผ่านคลาวด์ได้อยู่
     */
    if (this.localReady === true) recognition.processLocally = true;

    let settled = false;
    /** ผู้ใช้สั่งหยุดเองแล้ว — ห้ามเปิดฟังต่ออีก */
    let stopped = false;
    let lastSoundAt = Date.now();
    /** กันลูปเปิดฟังใหม่ไม่รู้จบเวลาไมค์มีปัญหาจริง ๆ */
    let restarts = 0;
    let bestAlternatives: string[] = [];
    let bestConfidence: number | undefined;
    /** ข้อความช่วงที่ถอดจบแล้ว ใช้เฉพาะโหมดต่อเนื่อง */
    const finalSegments: string[] = [];

    const finish = (outcome: Parameters<typeof onDone>[0]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      onDone(outcome);
    };

    const timer = setTimeout(() => {
      recognition.abort();
      finish({ kind: "failed", reason: "no-speech" });
    }, timeoutMs);

    recognition.onspeechstart = () => {
      lastSoundAt = Date.now();
      onSpeechStart?.();
    };

    recognition.onresult = (event) => {
      lastSoundAt = Date.now();
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];

        if (!result.isFinal) {
          interim = result[0]?.transcript ?? "";
          continue;
        }

        const alternatives: string[] = [];
        for (let j = 0; j < result.length; j += 1) {
          const text = result[j]?.transcript?.trim();
          if (text) alternatives.push(text);
        }

        if (alternatives.length > 0) {
          bestAlternatives = alternatives;
          bestConfidence = result[0]?.confidence;
          if (continuous) finalSegments.push(alternatives[0]);
        }
      }

      /**
       * โหมดต่อเนื่องส่งข้อความ **ที่สะสมมาทั้งหมด** ไม่ใช่เฉพาะช่วงล่าสุด
       * เพราะตัวไฮไลต์ของเกมอ่านต้องรู้ว่าอ่านมาถึงไหนของทั้งเรื่อง
       * ไม่ใช่รู้แค่ประโยคที่กำลังพูดอยู่
       */
      onInterim?.(
        continuous
          ? [...finalSegments, interim].join(" ").trim()
          : interim,
      );

      // ไม่ปิดงานที่นี่ รอ onend เพื่อให้ได้ผลสุดท้ายครบทุกก้อน
    };

    recognition.onerror = (event) => {
      /**
       * no-speech ที่มาพร้อมผลที่ถอดได้แล้ว ไม่ใช่ความล้มเหลว
       * บางเบราว์เซอร์ยิง error ตัวนี้ตอนปิดไมค์แม้จะได้ข้อความมาแล้ว
       */
      if (event.error === "no-speech" && bestAlternatives.length > 0) return;

      finish({
        kind: "failed",
        reason: FAILURE_BY_CODE[event.error] ?? "unknown",
      });
    };

    recognition.onend = () => {
      /*
       * เบราว์เซอร์ปิดเองเมื่อคิดว่าพูดจบ ซึ่งเร็วเกินไปสำหรับเด็กที่กำลัง
       * นึกประโยค ถ้ายังไม่เงียบครบตามที่ขอ ให้เปิดฟังต่อเองเงียบ ๆ
       * เด็กจะไม่รู้เลยว่ามันเปิดใหม่ รู้แค่ว่าไมค์ยังเปิดอยู่
       */
      const quietFor = Date.now() - lastSoundAt;
      if (
        !settled &&
        !stopped &&
        silenceGraceMs > 0 &&
        quietFor < silenceGraceMs &&
        restarts < MAX_RESTARTS
      ) {
        restarts += 1;
        try {
          recognition.start();
          return;
        } catch {
          // เปิดต่อไม่ได้ก็ปิดงานตามปกติด้านล่าง
        }
      }

      if (bestAlternatives.length === 0) {
        finish({ kind: "failed", reason: "no-speech" });
        return;
      }

      /**
       * โหมดต่อเนื่องคืนทุกช่วงต่อกันเป็นก้อนเดียว ไม่ใช่ตัวเลือกหลายตัว
       * เพราะเรื่องหนึ่งคือลำดับคำชุดเดียว การเอาตัวเลือกของประโยคสุดท้าย
       * มาเป็นคำตอบของทั้งเรื่องจะทิ้งทุกอย่างที่เด็กอ่านมาก่อนหน้า
       */
      finish({
        kind: "heard",
        heard: {
          alternatives: continuous
            ? [finalSegments.join(" ").trim()]
            : bestAlternatives,
          confidence: bestConfidence,
        },
      });
    };

    try {
      recognition.start();
    } catch {
      // start() ซ้อนกันสองครั้งจะโยน — ถือว่ายกเลิกไป ไม่ใช่เด็กพูดผิด
      finish({ kind: "failed", reason: "aborted" });
    }

    return {
      stop() {
        stopped = true;
        recognition.stop();
      },
      abort() {
        stopped = true;
        recognition.abort();
        finish({ kind: "failed", reason: "aborted" });
      },
    };
  }
}

export const browserRecognizer: SpeechRecognizer = new BrowserRecognizer();
