/**
 * แปลง JSON Schema ที่ zod สร้างให้เป็นรูปแบบที่ Gemini รับได้
 *
 * Gemini รองรับ JSON Schema แค่บางส่วน ถ้าส่งคีย์ที่มันไม่รู้จักไปด้วย
 * (เช่น `$schema` หรือ `additionalProperties` ที่ zod ใส่มาให้เองเสมอ)
 * จะได้ 400 Invalid argument กลับมาโดยไม่บอกว่าคีย์ไหนผิด
 *
 * ที่ต้องแปลงแทนการเขียน schema มือ: schema ของคำตอบถูกนิยามด้วย zod
 * อยู่แล้วเพื่อ validate ตอนรับกลับ ถ้าเขียนอีกชุดให้โมเดลด้วยมือ
 * สองชุดจะหลุดจากกันวันที่ใครสักคนเพิ่มฟิลด์
 */

/** คีย์ที่ Gemini รู้จัก (ดู https://ai.google.dev/api/caching#Schema) */
const SUPPORTED_KEYS = new Set([
  "type",
  "format",
  "description",
  "nullable",
  "enum",
  "items",
  "properties",
  "required",
  "minItems",
  "maxItems",
  "propertyOrdering",
]);

type JsonSchema = Record<string, unknown>;

export function toGeminiSchema(schema: JsonSchema): JsonSchema {
  const out: JsonSchema = {};

  for (const [key, value] of Object.entries(schema)) {
    if (!SUPPORTED_KEYS.has(key)) continue;

    if (key === "properties" && value && typeof value === "object") {
      const properties: JsonSchema = {};
      for (const [name, child] of Object.entries(value as JsonSchema)) {
        properties[name] = toGeminiSchema(child as JsonSchema);
      }
      out.properties = properties;
      continue;
    }

    if (key === "items" && value && typeof value === "object") {
      out.items = toGeminiSchema(value as JsonSchema);
      continue;
    }

    out[key] = value;
  }

  return out;
}
