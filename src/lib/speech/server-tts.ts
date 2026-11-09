import type { SpeakOptions, TtsProvider } from "./types";

/**
 * เสียงจากบริการคลาวด์ ผ่าน API route ของเราเอง (`/api/tts`)
 *
 * ฝั่งนี้ไม่รู้จักคีย์และไม่รู้ด้วยซ้ำว่าใช้เจ้าไหน รู้แค่ว่าส่งข้อความไป
 * แล้วได้ไฟล์เสียงกลับมา — เปลี่ยนผู้ให้บริการทีหลังแก้แค่ฝั่งเซิร์ฟเวอร์
 *
 * ต่างจาก Kokoro ตรงที่ไม่ต้องโหลดโมเดล 88 MB และเสียงดีกว่า
 * แต่ต้องต่อเน็ตทุกครั้งและมีค่าใช้จ่ายตามจำนวนตัวอักษร
 */
class ServerTtsProvider implements TtsProvider {
  readonly id = "server";

  private audio: HTMLAudioElement | null = null;
  private url: string | null = null;
  private configured: boolean | null = null;

  isAvailable(): boolean {
    return typeof window !== "undefined" && typeof Audio !== "undefined";
  }

  /**
   * ตั้งคีย์ไว้ที่เซิร์ฟเวอร์หรือยัง
   *
   * ถามครั้งเดียวแล้วจำไว้ เพราะค่านี้เปลี่ยนได้ก็ต่อเมื่อรีสตาร์ตเซิร์ฟเวอร์
   */
  async isConfigured(): Promise<boolean> {
    if (this.configured !== null) return this.configured;
    if (!this.isAvailable()) return false;

    try {
      const response = await fetch("/api/tts");
      const payload = (await response.json()) as { configured?: boolean };
      this.configured = Boolean(payload.configured);
    } catch {
      this.configured = false;
    }

    return this.configured;
  }

  async speak(text: string, options: SpeakOptions = {}): Promise<void> {
    if (!this.isAvailable()) return;

    this.cancel();

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        // ตั้งคีย์ไว้แต่เรียกไม่สำเร็จ ผู้เรียกมีทางถอยอยู่แล้ว
        if (response.status === 503) this.configured = false;
        return;
      }

      const url = URL.createObjectURL(await response.blob());
      const element = new Audio(url);
      element.volume = options.volume ?? 1;
      if (options.rate) element.playbackRate = options.rate;

      this.audio = element;
      this.url = url;

      await new Promise<void>((resolve) => {
        element.onended = () => resolve();
        // เล่นไม่ได้ก็ไม่ควรทำให้หน้าจอค้าง — จบเงียบ ๆ
        element.onerror = () => resolve();
        void element.play().catch(() => resolve());
      });
    } catch {
      // เน็ตหลุดระหว่างทาง ปล่อยให้ผู้เรียกถอยไปเสียงอื่น
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

export const serverTts = new ServerTtsProvider();
