# ตรวจคำแปลไทยย้อนทาง

สร้างด้วย `npm run check:thai-back` — อย่าแก้ไฟล์นี้ด้วยมือ

`check:thai` ถามว่า "คำแปลไทยของเราอยู่ในรายการคำแปลของคำอังกฤษนี้ไหม"
ไฟล์นี้ถามกลับทางว่า **"คำไทยคำนี้ แปลกลับเป็นอังกฤษแล้วได้คำเดิมไหม"**
เพราะรายการคำแปลของคำอังกฤษหนึ่งคำรวมทุกความหมายไว้ด้วยกัน คำแปลที่
"อยู่ในรายการจริงแต่เป็นความหมายคนละอัน" จึงผ่านด่านเดิมไปได้

สามแหล่งที่ใช้

1. **en.wiktionary หน้าของคำไทยเอง** — คนละหน้าและคนละกลุ่มผู้เขียนกับตาราง
   คำแปลที่ `check:thai` ใช้ แต่ **ยังเป็นโครงการเดียวกัน ไม่ใช่แหล่งอิสระ**
2. **th.wiktionary** — คนละโครงการ นิยามเป็นภาษาไทย เครื่องเทียบให้ไม่ได้
   รายงานแค่ว่ามีหน้าหรือไม่ ไว้ให้คนตามไปอ่าน
3. **th.wikipedia** แล้วตามลิงก์ข้ามภาษาไปอังกฤษ — ใช้ได้กับคำนามรูปธรรม

**ไม่ใช่ด่านที่ผ่านหรือไม่ผ่าน** คำแปลหลายคำเป็นคำประสมที่ไม่มีหน้าใน
พจนานุกรมเล่มไหน การไม่มีข้อมูลไม่ได้แปลว่าคำแปลผิด

## สรุป

| สถานะ | จำนวน |
|---|---|
| ยืนยันได้จากการแปลกลับ | 819 |
| มีคำแปลกลับ แต่ไม่ตรงกับคำของเรา — **ต้องให้คนอ่าน** | 73 |
| ไม่มีหน้าคำไทยนี้ใน en.wiktionary — ไม่มีข้อมูล | 90 |
| รวม | 982 |

แยกตามระดับ

| ระดับ | คำ | ยืนยันได้ | สัดส่วน |
|---|---|---|---|
| Pre-A1 | 120 | 105 | 88% |
| A1 | 266 | 250 | 94% |
| A2 | 156 | 136 | 87% |
| B1 | 186 | 142 | 76% |
| B2 | 192 | 145 | 76% |
| C1 | 62 | 41 | 66% |

## มีคำแปลกลับ แต่ไม่ตรงกับคำของเรา (73 คำ)

คำกลุ่มนี้ **ส่วนใหญ่ไม่ได้ผิด** — เป็นคำพ้องความหมายที่พจนานุกรมเลือกใช้
คำอังกฤษอีกคำอธิบาย (เช่น baby อธิบายด้วย infant) แต่กลุ่มนี้คือกลุ่มที่
คนต้องอ่านเอง เพราะคำที่ผิดจริงจะซ่อนอยู่ในนี้

| คำ | ระดับ | ที่มา | คำแปลของเรา | แปลกลับได้ |
|---|---|---|---|---|
| two | Pre-A1 | wiktionary | `สอง` | 2 (Thai numeral: ) |
| dog | Pre-A1 | wiktionary | `สุนัข` | ( ) dogmeat |
| baby | Pre-A1 | adapted | `เด็กทารก` | infant |
| me | Pre-A1 | wiktionary | `ฉัน` | as; like; as if · as; like · to eat; to drink; to take; to consume · shining; radiating; light; luminous |
| hair | Pre-A1 | wiktionary | `ผม` | headhair. · a first person pronoun employed by a male when addressing any commoner. |
| eraser | Pre-A1 | wiktionary | `ยางลบ` | rubber: device for erasing marks made with pen, pencil, etc. |
| car | Pre-A1 | wiktionary | `รถยนต์` | motorcar; automobile. |
| bike | Pre-A1 | wiktionary | `จักรยาน` | bicycle |
| watch | A1 | wiktionary | `นาฬิกาข้อมือ` | wristwatch. |
| say | A1 | wiktionary | `พูด` | to speak |
| learn | A1 | wiktionary | `เรียนรู้` | study |
| country | A1 | wiktionary | `ประเทศ` | nation; also used as a prefix to the name of a nation · area; district; locality; place; region; spot · city;  |
| forty | A1 | wiktionary | `สี่สิบ` | 40 (Thai numeral: ) |
| fifty | A1 | wiktionary | `ห้าสิบ` | 50 (Thai numeral: ) |
| sixty | A1 | wiktionary | `หกสิบ` | 60 (Thai numeral: ) |
| seventy | A1 | wiktionary | `เจ็ดสิบ` | 70 (Thai numeral: ) |
| eighty | A1 | wiktionary | `แปดสิบ` | 80 (Thai numeral: ) |
| ninety | A1 | wiktionary | `เก้าสิบ` | 90 (Thai numeral: ) |
| stomach | A2 | wiktionary | `ท้อง` | abdomen; belly · womb · pregnancy · body, content, extent, essence, or main part (of something large, vast, gr |
| worried | A2 | adapted | `กังวล` | to worry; to be anxious |
| relaxed | A2 | adapted | `ผ่อนคลาย` | to relieve; to ease; to relax. |
| path | A2 | wiktionary | `ทาง` | way, route, or course for travel · opportunity; chance · section; part; side · method; means; procedure; proce |
| textbook | A2 | wiktionary | `ตำรา` | edict; decree; command; ordinance. · standard work for a particular branch of study or knowledge, as , , etc.  |
| shell | A2 | wiktionary | `เปลือกหอย` | seashell. |
| shore | A2 | wiktionary | `ชายฝั่ง` | coast, seashore |
| slice | A2 | wiktionary | `ชิ้น` | piece |
| photo | A1 | adapted | `รูปถ่าย` | photograph; picture; image |
| king | A1 | wiktionary | `กษัตริย์` | # kṣatriya: those who fight, the ruling and military elite, being one of the four social classes in the societ |
| hello | A1 | wiktionary | `สวัสดี` | goodness; excellence; virtue<ref name = ":1"/> · wellness, well-being; safety, security; comfort, ease<ref nam |
| job | A1 | wiktionary | `งาน` | work: · # act; action; activity; deed · # duty; task; undertaking · # employment; trade; occupation; professio |
| dirt | B1 | wiktionary | `ดิน` | earth; ground; soil; land |
| ache | B1 | wiktionary | `ความเจ็บ` | pain |
| comfort | B1 | adapted | `ความสบาย` | wellness. |
| delight | B1 | adapted | `ความยินดี` | gladness; pleasure |
| cabin | B1 | adapted | `กระท่อม` | cottage; hut · kratom |
| crossing | B1 | adapted | `ทางข้าม` | (pedestrian) crosswalk |
| achievement | B1 | wiktionary | `ความสำเร็จ` | : success; accomplishment |
| bold | B1 | adapted | `กล้า` | rice seedling · to be brave · hard · strong (sense or feeling) |
| eager | B1 | adapted | `กระตือรือร้น` | zealous; ardently active, devoted, or diligent. · having the power of quick motion; active; nimble. |
| applaud | B1 | wiktionary | `ตบมือ` | to clap |
| brief | B1 | adapted | `สั้น` | short |
| parrot | B1 | wiktionary | `นกแก้ว` | any clear, transparent substance, as crystal, diamond, glass, etc, whether natural or artificial · anything ma |
| kettle | B1 | adapted | `กาน้ำ` | teakettle |
| eagle | B2 | wiktionary | `อินทรี` | any of the birds of the family , commonly known as eagles · any of the fish of the genus , in the family , com |
| arena | B2 | wiktionary | `สนาม` | lawn, yard · field, ground (for sports, airplanes, etc.) |
| dock | B2 | wiktionary | `ท่า` | river;<ref> </ref> river water<ref> </ref> · port; pier; quay · posture; gesture · to wait (for); to await |
| ferryboat | B2 | adapted | `เรือข้ามฟาก` | ferry |
| invisible | B2 | wiktionary | `ล่องหน` | to vanish through or as if through magic. · to disappear; to be absent; to be missing; to be no longer seen. |
| dove | B2 | wiktionary | `นกเขา` | ( ) any of the various birds of the genus <ref>{{cite-web · ( ) some fish of the genus or of the family <ref>{ |
| worm | B2 | wiktionary | `หนอน` | larva of insect. · penis. |
| wasp | B2 | wiktionary | `ตัวต่อ` | building blocks; blocks made of wood or plastic used as children's toys can be stacked or joined to form a lar |
| ornament | B2 | adapted | `เครื่องประดับ` | accessory. |
| fabric | B2 | wiktionary | `ผ้า` | cloth |
| mighty | B2 | wiktionary | `ทรงพลัง` | powerful, potent |
| stiff | B2 | wiktionary | `แข็ง` | hard; rigid |
| creepy | B2 | wiktionary | `น่ากลัว` | scary; frightful. |
| obedient | B2 | wiktionary | `เชื่อฟัง` | to obey. |
| lecturer | B2 | wiktionary | `อาจารย์` | teacher: one who teaches, especially as a profession · # instructor: teacher in a higher education institution |
| colleague | B2 | wiktionary | `เพื่อนร่วมงาน` | coworker, co-worker |
| excursion | B2 | wiktionary | `การท่องเที่ยว` | : traveling |
| diploma | B2 | wiktionary | `ประกาศนียบัตร` | certificate: document confirming a qualification, status, etc. · certificate: document confirming that a perso |
| metaphor | B2 | wiktionary | `อุปมา` | something to which an action, condition, etc, is compared, such as "dream" in "beautiful like a dream". · anal |
| mumble | B2 | wiktionary | `พึมพำ` | to mutter |
| reward | B2 | wiktionary | `ตอบแทน` | to repay, to pay back. · to reciprocate, to retaliate. |
| terrain | C1 | wiktionary | `ภูมิประเทศ` | scenery, landscape |
| fanciful | C1 | wiktionary | `เพ้อฝัน` | to daydream; to fancy; to be delusional. |
| voracious | C1 | wiktionary | `ตะกละ` | gluttony · gluttonous; greedy; ravenous |
| overalls | C1 | wiktionary | `เอี๊ยม` | (classifier or ) dudou · (classifier ) brace: adjustable strap |
| accustomed | C1 | wiktionary | `คุ้นเคย` | to become familiar, habitual |
| wary | C1 | wiktionary | `ระวัง` | to beware; to be careful; to take care |
| stray | C1 | wiktionary | `จรจัด` | homeless; vagrant. |
| intellect | C1 | wiktionary | `ปัญญา` | wisdom; knowledge; intelligence · ability |
| clutch | C1 | wiktionary | `คว้า` | to seize; to grab |

## ไม่มีหน้าคำไทยนี้ใน en.wiktionary (90 คำ)

ตรวจด้วยวิธีนี้ไม่ได้ ไม่ได้แปลว่าผิด — ส่วนใหญ่เป็นคำประสม
เครื่องหมาย `*` คือมีหน้าใน th.wiktionary ให้คนตามไปอ่านได้
(24 คำ)

sister=พี่สาวหรือน้องสาว · brother=พี่ชายหรือน้องชาย · grandmother=ยายหรือย่า · grandfather=ตาหรือปู่ · face=ใบหน้า* · teacher=คุณครู · happy=มีความสุข · coat=เสื้อโค้ท · medal=เหรียญรางวัล · thirsty=กระหายน้ำ · empty=ว่างเปล่า* · perfect=สมบูรณ์แบบ · useful=มีประโยชน์ · weekday=วันธรรมดา · beginning=จุดเริ่มต้น · quiz=แบบทดสอบ · sunflower=ดอกทานตะวัน* · pea=ลันเตา* · cereal=ซีเรียล* · continue=ทำต่อไป · pocket=กระเป๋าเสื้อ · cure=การรักษา* · correction=การแก้ไข* · anger=ความโกรธ* · boredom=ความเบื่อ* · curiosity=ความอยากรู้ · arrange=จัดเรียง · huge=ใหญ่โต* · boot=รองเท้าบูต · curve=เส้นโค้ง* · builder=ผู้ก่อสร้าง · comedian=นักแสดงตลก · climber=นักไต่เขา · campsite=ที่ตั้งแคมป์ · comparison=การเปรียบเทียบ* · composition=เรียงความ · conclusion=ข้อสรุป* · appetite=ความอยากอาหาร · curious=อยากรู้ · complete=ทำให้เสร็จ · deliver=ส่งมอบ* · careless=สะเพร่า* · amazing=น่าทึ่ง · bald=หัวล้าน · broad=กว้างขวาง* · delicate=บอบบาง · sunrise=ตะวันขึ้น · arrival=การมาถึง · feed=ให้อาหาร · mend=ปะซ่อม · fasten=รัดให้แน่น · active=กระฉับกระเฉง* · cherry=เชอร์รี่ · rug=พรมผืนเล็ก · laptop=แล็ปท็อป · shed=โรงเก็บของ · cottage=บ้านชนบท · villa=วิลล่า · mist=หมอกบาง · dandelion=แดนดี้ไลออน · motorbike=มอเตอร์ไซค์* · yacht=เรือยอชต์ · soar=ทะยาน* · fierce=ดุร้าย* · muddy=เลอะโคลน · clam=หอยกาบ · label=ฉลาก* · doorway=ช่องประตู · gateway=ประตูทางเข้า · costume=เครื่องแต่งกาย · overcoat=เสื้อคลุมยาว · snowball=ก้อนหิมะ · scuba=สกูบา · trophy=ถ้วยรางวัล · nod=พยักหน้า · chase=ไล่กวด · rusty=เป็นสนิม · stamp=ย่ำเท้า · pounce=ตะปบ · seedling=ต้นอ่อน* · pioneer=ผู้บุกเบิก · cavity=ฟันผุ · vertical=ตั้งตรง · folktale=นิทานพื้นบ้าน · salvage=กอบกู้ · resin=ยางไม้ · billiards=บิลเลียด* · credible=น่าเชื่อถือ · daydream=ฝันกลางวัน* · provoke=ยั่วยุ
