import type { SpeakOptions, TtsProvider } from "./types";

/**
 * เสียงพูดด้วยโมเดล Kokoro ที่รันในเครื่องผู้ใช้
 *
 * เสียงที่ติดมากับเบราว์เซอร์คุณภาพขึ้นกับเครื่อง และส่วนใหญ่เป็นเสียง
 * ผู้ใหญ่อ่านเรียบ ๆ แบบระบบประกาศ ซึ่งไม่เหมาะกับตัวละครที่เด็กควรอยากคุยด้วย
 * Kokoro เป็นโมเดลโอเพนซอร์ส (Apache-2.0) ที่ให้เสียงเป็นธรรมชาติกว่ามาก
 *
 * **ราคาที่ต้องจ่าย: ครั้งแรกต้องโหลดโมเดลราว 88 MB** จึงเปิดใช้เองไม่ได้
 * ต้องให้ผู้ใช้กดเลือก และต้องมีทางถอยกลับไปใช้เสียงเบราว์เซอร์เสมอ
 * เพราะเครื่องที่เน็ตช้าหรือแรมน้อยจะโหลดไม่ไหว
 *
 * โมเดลถูกแคชโดยเบราว์เซอร์ (Cache API ของ transformers.js) ครั้งต่อไป
 * จึงไม่ต้องโหลดใหม่ และทำงานได้แม้ออฟไลน์
 */

/** ชื่อเสียงของ Kokoro ที่เลือกไว้ให้เลือกในแอป */
export const KOKORO_VOICES = [
  { id: "af_heart", label: "Heart — หญิง อบอุ่น" },
  { id: "af_bella", label: "Bella — หญิง สดใส" },
  { id: "af_nicole", label: "Nicole — หญิง นุ่ม" },
  { id: "af_sky", label: "Sky — หญิง เด็กกว่า" },
  { id: "bf_emma", label: "Emma — หญิง อังกฤษ" },
  { id: "am_puck", label: "Puck — ชาย ขี้เล่น" },
] as const;

export type KokoroVoiceId = (typeof KOKORO_VOICES)[number]["id"];

export const DEFAULT_KOKORO_VOICE: KokoroVoiceId = "af_heart";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
/** q8 ของ kokoro-js คือไฟล์ model_quantized.onnx ขนาดราว 88 MB */
const DTYPE = "q8";

type KokoroModel = {
  generate(
    text: string,
    options: { voice: string; speed?: number },
  ): Promise<{ toBlob(): Blob }>;
};

export type KokoroStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "failed"; message: string };

class KokoroTtsProvider implements TtsProvider {
  readonly id = "kokoro";

  private model: KokoroModel | null = null;
  private loading: Promise<KokoroModel> | null = null;
  private audio: HTMLAudioElement | null = null;
  private url: string | null = null;
  private listeners = new Set<(status: KokoroStatus) => void>();

  status: KokoroStatus = { kind: "idle" };

  /**
   * บอกได้แค่ว่า "สภาพแวดล้อมนี้มีสิทธิ์รันได้" ไม่ได้แปลว่าโหลดโมเดลสำเร็จ
   * ตัวที่บอกว่าใช้ได้จริงคือ status หลังเรียก load()
   */
  isAvailable(): boolean {
    return typeof window !== "undefined" && typeof Audio !== "undefined";
  }

  subscribe(listener: (status: KokoroStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setStatus(status: KokoroStatus) {
    this.status = status;
    for (const listener of this.listeners) listener(status);
  }

  /** โหลดโมเดล เรียกซ้ำได้ ครั้งที่สองขึ้นไปใช้ตัวเดิม */
  async load(): Promise<KokoroModel | null> {
    if (this.model) return this.model;
    if (this.loading) return this.loading;
    if (!this.isAvailable()) return null;

    this.setStatus({ kind: "loading" });

    this.loading = (async () => {
      // นำเข้าแบบ dynamic เพื่อไม่ให้ก้อนนี้ติดไปกับ bundle แรกของทุกหน้า
      const { KokoroTTS } = await import("kokoro-js");
      const model = (await KokoroTTS.from_pretrained(MODEL_ID, {
        dtype: DTYPE,
      })) as unknown as KokoroModel;

      this.model = model;
      this.setStatus({ kind: "ready" });
      return model;
    })();

    try {
      return await this.loading;
    } catch (error) {
      this.loading = null;
      this.setStatus({
        kind: "failed",
        message: error instanceof Error ? error.message : "โหลดเสียงไม่สำเร็จ",
      });
      return null;
    }
  }

  async speak(text: string, options: SpeakOptions = {}): Promise<void> {
    const model = await this.load();
    if (!model) return;

    this.cancel();

    try {
      const audio = await model.generate(text, {
        voice: options.voiceId ?? DEFAULT_KOKORO_VOICE,
        // Kokoro คุม pitch ไม่ได้ ความน่ารักจึงมาจากตัวเสียงที่เลือก ไม่ใช่การปรับ
        speed: options.rate ?? 1,
      });

      const url = URL.createObjectURL(audio.toBlob());
      const element = new Audio(url);
      element.volume = options.volume ?? 1;

      this.audio = element;
      this.url = url;

      await new Promise<void>((resolve) => {
        element.onended = () => resolve();
        // อ่านไม่ออกไม่ควรทำให้หน้าจอค้าง — จบเงียบ ๆ เหมือนตัว browser
        element.onerror = () => resolve();
        void element.play().catch(() => resolve());
      });
    } catch {
      // ปล่อยผ่าน ผู้เรียกมีทางถอยไปเสียงเบราว์เซอร์อยู่แล้ว
    } finally {
      this.release();
    }
  }

  private release() {
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
    this.audio = null;
  }

  cancel(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.release();
  }
}

export const kokoroTts = new KokoroTtsProvider();
