require('dotenv').config(); // โหลดตัวแปรจาก .env
const express = require('express');
const line = require('@line/bot-sdk');
const app = express();

// ตั้งค่า config จาก ENV
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

// LINE client
const client = new line.Client(config);

// Middleware
app.post('/webhook', line.middleware(config), async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map(handleEvent));
  res.json(results);
});

// ฟังก์ชันตอบข้อความ
function replyText(replyToken, text) {
  return client.replyMessage(replyToken, {
    type: 'text',
    text
  });
}

// ดึงชื่อผู้ใช้จาก userId
async function getUserDisplayName(userId) {
  try {
    const profile = await client.getProfile(userId);
    return profile.displayName || '';
  } catch (error) {
    console.error('Error getting user profile:', error);
    return '';
  }
}

// โค้ด handleEvent (จากที่คุณให้มา)
async function handleEvent(event) {
  console.log('Received event:', JSON.stringify(event, null, 2));
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const text = event.message.text.toLowerCase();

  const greetings = ['สวัสดี', 'ดีครับ', 'ดีค่ะ', 'hello', 'hi', 'hey', 'ทัก', 'มีใครอยู่ไหม'];
  if (greetings.some(g => text.includes(g))) {
    const displayName = event.source?.userId
      ? await getUserDisplayName(event.source.userId)
      : 'ค่ะ';
    return replyText(event.replyToken, `สวัสดีคุณ${displayName} 😊 มีอะไรให้ช่วยสอบถามได้นะคะ`);
  }

  const priceCalcResult = calculatePrice(text); // *หากใช้ฟังก์ชันนี้ต้องนิยามเพิ่ม
  if (priceCalcResult) {
    return replyText(event.replyToken, priceCalcResult + '\nหากต้องการจอง กรุณาแจ้งเพื่อดำเนินการต่อได้เลยค่ะ');
  }

  const extraQuestions = [
    {
      keywords: ['เสียตรงนี้ต้องเสียเพิ่มไหม', 'ต้องเสียเพิ่มไหม', 'เสียเพิ่มไหม', 'มีค่าใช้จ่ายเพิ่มไหม', 'จ่ายเพิ่ม', 'จ่ายเพิ่มไหม', 'เสียเพิ่ม'],
      reply: 'ไม่มีค่าใช้จ่ายเพิ่มเติมค่ะ'
    },
    {
      keywords: ['โปรนี้มีถึงเมื่อไหร่', 'โปรหมดเมื่อไหร่', 'โปรสิ้นสุดเมื่อไหร่', 'โปรนี้สิ้นสุดเมื่อไหร่', 'โปรโมชั่นหมดเมื่อไหร่'],
      reply: 'โปรโมชั่นนี้ยังไม่มีวันสิ้นสุดค่ะ'
    },
    {
      keywords: ['สมัครงานได้ไหม', 'รับสมัครงานไหม', 'สมัครงานได้ที่ไหน', 'อยากสมัครงาน', 'มีงานทำไหม'],
      reply: 'สามารถสมัครงานได้ที่สยามชัยหาดทรายขาวค่ะ'
    },
    {
      keywords: ['จำกัดจำนวนไหม', 'มีจำกัดจำนวนไหม', 'จำนวนจำกัดไหม', 'จำกัดผู้เข้าร่วมไหม', 'จำนวนคนจำกัดไหม'],
      reply: 'ลูกค้าสามารถเข้ามาได้โดยไม่จำกัดจำนวนค่ะ'
    },
    {
      keywords: ['จุดปฐมพยาบาล', 'มีจุดปฐมพยาบาลไหม', 'ปฐมพยาบาล', 'สถานีปฐมพยาบาล', 'ที่ปฐมพยาบาล'],
      reply: 'มีจุดปฐมพยาบาลให้บริการที่บริเวณทางเข้า ลูกค้าสามารถติดต่อเจ้าหน้าที่ได้เลยค่ะ'
    }
  ];
  for (const q of extraQuestions) {
    if (q.keywords.some(k => text.includes(k))) {
      return replyText(event.replyToken, q.reply);
    }
  }

  const bookingKeywords = ['ซื้อ', 'จอง', 'ซื้อตั๋ว', 'จองตั๋ว', 'จองบัตร', 'ซื้อตั๋วเข้า'];
  if (bookingKeywords.some(k => text.includes(k))) {
    return replyText(event.replyToken, 'คุณสามารถซื้อบัตรผ่านทาง LINE นี้ได้เลยค่ะ กรุณาแจ้งจำนวนผู้ใหญ่และเด็กที่ต้องการจองค่ะ');
  }

  if (text.includes('ชำระ') || text.includes('จ่าย') || text.includes('โอน')) {
    return client.replyMessage(event.replyToken, {
      type: 'image',
      originalContentUrl: 'https://cdn.glitch.global/.../สลิปเจ้า.jfif',
      previewImageUrl: 'https://cdn.glitch.global/.../สลิปเจ้า.jfif'
    });
  }

  const checks = [
    {
      keywords: ['เปิด', 'เวลาทำการ', 'กี่โมง'],
      reply: 'เปิดให้บริการทุกวัน ตั้งแต่เวลา 08.00 - 00.00 น. ค่ะ'
    },
    {
      keywords: ['จอดรถ', 'ที่จอดรถ', 'ลานจอดรถ'],
      reply: 'ทางเรามีที่จอดรถฟรีสำหรับลูกค้าทุกท่านค่ะ'
    },
    {
      keywords: ['ค่าเข้า', 'ราคาบัตร', 'ค่าใช้จ่าย', 'ค่าตั๋ว', 'ค่าบัตร', 'บัตรราคา'],
      reply: 'ค่าเข้าสยามชัยหาดทรายขาว ผู้ใหญ่ 40 บาท เด็กต่ำกว่า 10 ปี และผู้สูงอายุ เข้าฟรี\nโซนทะเลนครปฐม ผู้ใหญ่ 120 บาท เด็ก 60 บาทค่ะ'
    },
    {
      keywords: ['ที่ไหน', 'อยู่ที่ไหน', 'ตั้งอยู่', 'แผนที่'],
      reply: 'สยามชัยหาดทรายขาวอยู่จังหวัดนครปฐม ดูแผนที่: https://g.co/kgs/k1Zv8V2'
    },
    {
      keywords: ['เล่นน้ำ', 'น้ำ', 'ว่ายน้ำ'],
      reply: 'สามารถเล่นน้ำได้ถึง 18.00 น. หรือบริเวณหลังร้านอาหารสามชัยได้ถึง 21.00 น.'
    },
    {
      keywords: ['อาหาร', 'นำอาหาร', 'ของกิน', 'เครื่องดื่ม', 'กินอะไร', 'ขายอาหาร'],
      reply: 'สามารถนำอาหารเข้ามาได้ ยกเว้นเครื่องดื่มซึ่งไม่อนุญาตให้นำเข้ามาค่ะ และภายในมีร้านอาหารและเครื่องดื่มจำหน่ายด้วยค่ะ'
    },
    {
      keywords: ['ร้านค้า', 'ร้านขายของ', 'ร้านขาย', 'มีร้านไหม'],
      reply: 'มีร้านค้าให้บริการรอบบริเวณหาดเลยค่ะ ทั้งของกิน ของเล่น และของใช้ค่ะ'
    },
    {
      keywords: ['คอนเสิร์ต', 'ดนตรี', 'โชว์', 'แสดง'],
      reply: 'สามารถติดตามกิจกรรมและคอนเสิร์ตได้ที่ Facebook เพจ "สยามชัยหาดทรายขาว" ค่ะ'
    },
    {
      keywords: ['สัตว์', 'หมา', 'แมว', 'สัตว์เลี้ยง'],
      reply: 'สามารถนำสัตว์เลี้ยงเข้ามาได้ โดยมีค่าบริการเท่ากับผู้ใหญ่ และกรุณาอย่าให้สัตว์เลี้ยงลงเล่นน้ำนะคะ'
    },
    {
      keywords: ['คืออะไร', 'ข้อมูลสถานที่', 'รายละเอียด', 'สถานที่ท่องเที่ยว'],
      reply: 'สยามชัยหาดทรายขาวเป็นสถานที่พักผ่อนหย่อนใจ มีโซนเล่นน้ำ ร้านอาหาร และกิจกรรมครอบครัวในจังหวัดนครปฐมค่ะ'
    },
    {
      keywords: ['ห้องพัก', 'ที่พัก', 'พัก', 'นอน'],
      reply: 'ขณะนี้ยังไม่มีบริการห้องพักค่ะ ลูกค้าสามารถพักผ่อนได้ในช่วงกลางวันเท่านั้น'
    }
  ];
  for (const item of checks) {
    if (item.keywords.some(k => text.includes(k))) {
      return replyText(event.replyToken, item.reply);
    }
  }

  return replyText(event.replyToken, 'ขออภัยค่ะ ไม่สามารถตอบคำถามนี้ได้ในขณะนี้ หากต้องการสอบถามเพิ่มเติม กรุณาระบุคำถามให้ชัดเจนขึ้นนะคะ');
}

// เปิดพอร์ตสำหรับ Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
