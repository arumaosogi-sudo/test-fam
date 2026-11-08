import type { SpeakOptions, TtsProvider } from "./types";

/**
 * TTS ด้วย Web Speech API ของเบราว์เซอร์ — ฟรี ไม่ต้องมี API key
 * ใช้ในเฟสเดโม และเป็น fallback ถาวรเวลาผู้ให้บริการคลาวด์ล่มหรือเน็ตหลุด
 *
 * ข้อจำกัดที่ต้องรู้: คุณภาพเสียงขึ้นกับเครื่องของผู้ใช้ และบางเครื่อง
 * (เช่น Linux หรือ Android บางรุ่น) อาจไม่มีเสียงภาษาอังกฤษติดมาเลย
 */
class BrowserTtsProvider implements TtsProvider {
  readonly id = "browser";

  private voices: SpeechSynthesisVoice[] = [];

  isAvailable(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  /**
   * รายชื่อเสียงใน Chrome โหลดแบบ async ต้องรอ event แรกก่อนจึงจะมีข้อมูล
   * เราเรียกซ้ำได้ ไม่มีผลข้างเคียง
   */
  private loadVoices() {
    if (!this.isAvailable()) return;
    const list = window.speechSynthesis.getVoices();
    if (list.length > 0) this.voices = list;
  }

  /** เลือกเสียงที่ "ฟังเป็นธรรมชาติที่สุด" ที่หาได้ในเครื่องนี้ */
  private pickVoice(
    lang: string,
    preferFemale = false,
  ): SpeechSynthesisVoice | undefined {
    this.loadVoices();
    const sameLang = this.voices.filter((v) =>
      v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()),
    );
    if (sameLang.length === 0) return undefined;

    /*
     * ชื่อเสียงไม่มีมาตรฐาน และ SpeechSynthesisVoice ไม่บอกเพศมาด้วย
     * จึงเดาจากชื่อที่พบบ่อยในเครื่องจริง — เดาพลาดก็แค่ได้เสียงอื่น
     * ไม่ได้ทำให้พัง และยังถูกปรับให้สูงขึ้นด้วย pitch อยู่ดี
     */
    const female =
      /female|zira|aria|jenny|samantha|karen|moira|tessa|google us english/i;

    if (preferFemale) {
      const pick = sameLang.find(
        (v) => female.test(v.name) && /google|natural/i.test(v.name),
      );
      if (pick) return pick;

      const anyFemale = sameLang.find((v) => female.test(v.name));
      if (anyFemale) return anyFemale;
    }

    // เสียง Google / Microsoft Natural มักคุณภาพดีกว่าเสียง default ของ OS
    const preferred = sameLang.find((v) => /google|natural|aria|jenny/i.test(v.name));
    return preferred ?? sameLang[0];
  }

  speak(text: string, options: SpeakOptions = {}): Promise<void> {
    if (!this.isAvailable()) return Promise.resolve();

    const {
      lang = "en-US",
      rate = 0.9,
      volume = 1,
      pitch = 1,
      preferFemale = false,
    } = options;

    return new Promise<void>((resolve) => {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      // เด็กต้องการช้ากว่าผู้ใหญ่เพื่อจับเสียงแต่ละคำได้ทัน
      utterance.rate = rate;
      utterance.volume = volume;
      // เบราว์เซอร์รับ 0–2 ค่านอกช่วงบางตัวเงียบไปเลย จึงหนีบไว้ก่อน
      utterance.pitch = Math.min(2, Math.max(0, pitch));

      const voice = this.pickVoice(lang, preferFemale);
      if (voice) utterance.voice = voice;

      utterance.onend = () => resolve();
      // ถ้าอ่านไม่ได้ก็ไม่ควรทำให้เกมค้าง — resolve เงียบ ๆ
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  }

  cancel(): void {
    if (!this.isAvailable()) return;
    window.speechSynthesis.cancel();
  }
}

export const browserTts: TtsProvider = new BrowserTtsProvider();
