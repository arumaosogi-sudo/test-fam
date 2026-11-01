import { describe, expect, it } from "vitest";
import { z } from "zod";

import { chatTurnSchema } from "@/lib/chat/types";

import { geminiResponseSchema } from "./gemini";
import { toGeminiSchema } from "./json-schema";

/** เดินทั้งต้นไม้แล้วเก็บชื่อคีย์ทุกชั้น ใช้ยืนยันว่าไม่มีคีย์แปลกปลอมหลงเหลือ */
function allKeys(node: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(node)) {
    for (const item of node) allKeys(item, found);
    return found;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      found.add(key);
      // ชื่อฟิลด์ใน properties ไม่ใช่คีย์ของ schema จึงไม่ต้องนับชั้นนั้น
      if (key === "properties" && value && typeof value === "object") {
        for (const child of Object.values(value)) allKeys(child, found);
      } else {
        allKeys(value, found);
      }
    }
  }
  return found;
}

const SUPPORTED = new Set([
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

describe("toGeminiSchema", () => {
  it("ตัดคีย์ที่ Gemini ไม่รู้จักออก", () => {
    const converted = toGeminiSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      properties: { a: { type: "string" } },
      required: ["a"],
    });

    expect(converted).toEqual({
      type: "object",
      properties: { a: { type: "string" } },
      required: ["a"],
    });
  });

  it("ตัดลึกลงไปในทุกชั้น ไม่ใช่แค่ชั้นบนสุด", () => {
    const converted = toGeminiSchema({
      type: "object",
      properties: {
        list: {
          type: "array",
          additionalProperties: false,
          items: {
            type: "object",
            additionalProperties: false,
            $schema: "x",
            properties: { b: { type: "string", additionalProperties: false } },
          },
        },
      },
    });

    expect(allKeys(converted).has("additionalProperties")).toBe(false);
    expect(allKeys(converted).has("$schema")).toBe(false);
  });

  it("เก็บ enum ไว้ครบ เพราะธงความปลอดภัยพึ่งค่าพวกนี้", () => {
    const converted = toGeminiSchema({
      type: "string",
      enum: ["none", "concerning"],
    });

    expect(converted.enum).toEqual(["none", "concerning"]);
  });
});

describe("geminiResponseSchema", () => {
  it("ไม่มีคีย์ที่ Gemini ไม่รองรับหลงเหลือเลย", () => {
    // ส่งคีย์ที่มันไม่รู้จักไปจะได้ 400 กลับมาโดยไม่บอกว่าคีย์ไหนผิด
    for (const key of allKeys(geminiResponseSchema)) {
      expect(SUPPORTED.has(key), `คีย์ที่ไม่รองรับ: ${key}`).toBe(true);
    }
  });

  it("มีทุกฟิลด์ที่ zod ต้องการ ไม่งั้นคำตอบจะไม่ผ่าน validate ขากลับ", () => {
    const fields = Object.keys(
      (z.toJSONSchema(chatTurnSchema) as { properties: object }).properties,
    );

    expect(Object.keys(geminiResponseSchema.properties as object)).toEqual(
      fields,
    );
    expect(geminiResponseSchema.required).toEqual(fields);
  });
});
