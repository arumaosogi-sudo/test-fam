# เครดิตและสัญญาอนุญาตของข้อมูลที่นำมาใช้

โปรเจกต์นี้ใช้งานข้อมูลเปิดสามแหล่ง **ทั้งสามเป็น CC BY-SA 4.0** ซึ่งบังคับทั้ง
การให้เครดิตและการเผยแพร่งานดัดแปลงด้วยสัญญาเดียวกัน

| แหล่ง | ใช้ทำอะไร | สัญญาอนุญาต |
|---|---|---|
| [OpenMoji](https://openmoji.org/) | ภาพประกอบคำศัพท์ทั้งหมดใน `public/words/` | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| [English Wiktionary](https://en.wiktionary.org/) ผ่าน [kaikki.org](https://kaikki.org/) | คำแปลไทยและคำอ่าน IPA | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| [NGSL 1.2](https://www.newgeneralservicelist.com/new-general-service-list) | รายการคำที่ใช้เลือกคำศัพท์ระดับ A1 รวมรายการเสริม (วัน เดือน ตัวเลข) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |

เรื่องอ่านทั้ง 20 เรื่องใน `src/content/readings.json` เขียนขึ้นใหม่สำหรับ
โปรเจกต์นี้ ไม่ได้คัดลอกมาจากที่ไหน แต่ใช้คำจากคลังคำที่อ้างอิง NGSL
จึงอยู่ใต้ข้อผูกพัน share-alike เดียวกันกับคลังคำ

## ข้อความให้เครดิตตามที่แต่ละแหล่งขอ

**OpenMoji**

> All emojis designed by [OpenMoji](https://openmoji.org/) – the open-source emoji
> and icon project. License: CC BY-SA 4.0

**Wiktionary / kaikki.org**

> คำแปลไทยและคำอ่านอ้างอิงจาก English Wiktionary (CC BY-SA 4.0)
> ผ่านข้อมูลที่สกัดเป็น JSON โดย [kaikki.org](https://kaikki.org/) ของ Tatu Ylonen

**NGSL**

> การคัดเลือกคำศัพท์ระดับ A1 อ้างอิงจาก New General Service List (NGSL) 1.2
> โดย Browne, Culligan และ Phillips — CC BY-SA 4.0

## สิ่งที่ต้องตัดสินใจก่อนเผยแพร่จริง

สัญญา **share-alike** ของทั้งสามแหล่งมีผลต่อสัญญาอนุญาตของตัวแอปเอง
อย่างน้อยส่วนที่เป็น *เนื้อหา* (คลังคำและภาพ) ต้องเผยแพร่ด้วย CC BY-SA 4.0
ส่วนซอร์สโค้ดเป็นงานคนละชิ้นและเลือกสัญญาแยกได้ แต่ควรระบุให้ชัดในที่เดียว
ว่าส่วนไหนอยู่ใต้สัญญาอะไร — ตอนนี้ยังไม่ได้ตัดสินใจ

หน้าเครดิตที่ผู้ใช้เห็นในแอปทำแล้วที่ `/credits` (ลิงก์อยู่บนหน้าแรก)
ตัวเลขในหน้านั้นนับจากคลังคำจริงตอน build ไม่ใช่ตัวเลขที่พิมพ์ค้างไว้

สิ่งที่ยังค้างคือ **การเลือกสัญญาอนุญาตของตัวแอปเอง** ซึ่งต้องตัดสินใจ
ก่อนเผยแพร่ต่อสาธารณะ
