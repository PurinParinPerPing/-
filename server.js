require('dotenv').config(); // โหลดค่า .env

const express = require('express');
const line = require('@line/bot-sdk');

const app = express();

// ตั้งค่าจาก environment
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

// สร้าง LINE client
const client = new line.Client(config);

// ✅ ต้องวาง line.middleware ก่อน express.json() เพื่อให้ LINE SDK อ่าน raw body ได้
app.post('/webhook', line.middleware(config), (req, res) => {
  console.log('Webhook called');

  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error:', err);
      res.status(500).send('Internal Server Error');
    });
});

// ✅ วาง express.json() หลังจาก webhook แล้ว
app.use(express.json());

// ฟังก์ชันคำนวณราคา
function calculatePrice(text) {
  const adultMatch = text.match(/ผู้ใหญ่\s*(\d+)/);
  const childMatch = text.match(/เด็ก\s*(\d+)/);
  if (!adultMatch && !childMatch) {
    return null;
  }
  const adultCount = adultMatch ? parseInt(adultMatch[1]) : 0;
  const childCount = childMatch ? parseInt(childMatch[1]) : 0;
  const total = (adultCount * 80) + (childCount * 40);
  return `ผู้ใหญ่ ${adultCount} คน เด็ก ${childCount} คน\nรวมทั้งหมด ${total} บาท`;
}

// ฟังก์ชันช่วยตอบข้อความ
function replyText(replyToken, text) {
  return client.replyMessage(replyToken, {
    type: 'text',
    text: text
  });
}

// ฟังก์ชันจัดการข้อความ
function handleEvent(event) {
  console.log('Received event:', JSON.stringify(event, null, 2));

  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const text = event.message.text.toLowerCase();

  // คีย์เวิร์ดกลุ่มต่าง ๆ
  const paymentKeywords = ['ชำระ', 'จ่าย', 'โอน', 'วิธีชำระ', 'โอนยังไง', 'จ่ายผ่าน', 'ชำระเงิน'];
  const generalInquiryKeywords = ['สอบถาม', 'ถาม', 'ช่วย', 'สวัสดี', 'hello', 'hi', 'สวัสดีค่ะ', 'สวัสดีครับ'];
  const bookingKeywords = ['จอง', 'ซื้อบัตร', 'ซื้อตั๋ว', 'ช่องทางซื้อ', 'ซื้อตั๋วออนไลน์'];
  const openingKeywords = ['เปิดกี่โมง', 'เปิดเวลา', 'เปิดถึงกี่โมง', 'เวลาทำการ', 'เวลาเปิด'];
  const parkingKeywords = ['จอดรถ', 'ที่จอดรถ', 'ลานจอดรถ'];
  const priceKeywords = ['ค่าเข้า', 'ราคาเข้า', 'ค่าใช้จ่าย', 'ค่าเข้าชม', 'ราคาบัตร'];
  const locationKeywords = ['ที่ไหน', 'อยู่ที่ไหน', 'ตั้งอยู่', 'สถานที่'];
  const swimKeywords = ['เล่นน้ำ', 'ลงน้ำ', 'ว่ายน้ำ', 'น้ำ'];
  const foodKeywords = ['อาหาร', 'เอาอาหาร', 'นำอาหาร', 'อาหารเข้า'];
  const concertKeywords = ['ดนตรี', 'คอนเสิร์ต', 'การแสดง', 'โชว์'];
  const petKeywords = ['สัตว์เลี้ยง', 'หมา', 'แมว', 'นำสัตว์', 'สัตว์'];
  const aboutPlaceKeywords = ['คืออะไร', 'ที่เที่ยว', 'รายละเอียด', 'ที่นี่คือ', 'ข้อมูลสถานที่'];
  const roomKeywords = ['ห้องพัก', 'ที่พัก', 'นอน', 'พัก', 'ที่พักผ่อน'];

  // คำถามพิเศษพร้อมคำตอบ
  const extraQuestions = [
    {
      keywords: ['เสียตรงนี้ต้องเสียเพิ่มไหม', 'ต้องเสียเพิ่มไหม', 'เสียเพิ่มไหม', 'มีค่าใช้จ่ายเพิ่มไหม','จ่ายเพิ่ม', 'จ่ายเพิ่มไหม','เสียเพิ่ม'],
      reply: 'ไม่ต้องเสียเพิ่ม'
    },
    {
      keywords: ['โปรนี้มีถึงเมื่อไหร่', 'โปรหมดเมื่อไหร่', 'โปรสิ้นสุดเมื่อไหร่', 'โปรนี้สิ้นสุดเมื่อไหร่', 'โปรโมชั่นหมดเมื่อไหร่'],
      reply: 'ยังไม่มีกำหนดสิ้นสุด'
    },
    {
      keywords: ['สมัครงานได้ไหม', 'รับสมัครงานไหม', 'สมัครงานได้ที่ไหน', 'อยากสมัครงาน', 'มีงานทำไหม'],
      reply: 'สมัครงานได้ที่สยามชัยหาดทรายขาว'
    },
    {
      keywords: ['จำกัดจำนวนไหม', 'มีจำกัดจำนวนไหม', 'จำนวนจำกัดไหม', 'จำกัดผู้เข้าร่วมไหม', 'จำนวนคนจำกัดไหม'],
      reply: 'ไม่จำกัดจำนวน'
    },
    {
      keywords: ['จุดปฐมพยาบาล', 'มีจุดปฐมพยาบาลไหม', 'ปฐมพยาบาล', 'สถานีปฐมพยาบาล', 'ที่ปฐมพยาบาล'],
      reply: 'มีจุดปฐมพยาบาล ติดต่อที่ทางเข้าได้เลย'
    }
  ];

  // เช็คคำถามพิเศษก่อน
  for (const q of extraQuestions) {
    if (q.keywords.some(k => text.includes(k))) {
      return replyText(event.replyToken, q.reply);
    }
  }

  // เช็คคำถามกลุ่มหลัก
  if (paymentKeywords.some(k => text.includes(k))) {
    return client.replyMessage(event.replyToken, {
      type: 'image',
      originalContentUrl: 'https://cdn.glitch.global/c0914ca7-8b8c-41a8-be31-f52cde5b3ea2/%E0%B8%AA%E0%B8%A5%E0%B8%B4%E0%B8%9B%E0%B9%80%E0%B8%88%E0%B9%89.jfif?v=1748077534886',
      previewImageUrl: 'https://cdn.glitch.global/c0914ca7-8b8c-41a8-be31-f52cde5b3ea2/%E0%B8%AA%E0%B8%A5%E0%B8%B4%E0%B8%9B%E0%B9%80%E0%B8%88%E0%B9%89.jfif?v=1748077534886'
    });
  }

  if (bookingKeywords.some(k => text.includes(k))) {
    return replyText(event.replyToken, 'สวัสดี คุณสามารถซื้อบัตรใน LINE นี้ได้ แจ้งจำนวนผู้ใหญ่และเด็กที่มาเที่ยวได้เลย');
  }

  if (openingKeywords.some(k => text.includes(k))) {
    return replyText(event.replyToken, 'เปิดให้บริการตั้งแต่เวลา 08.00 - 00.00');
  }

  if (parkingKeywords.some(k => text.includes(k))) {
    return replyText(event.replyToken, 'มีที่จอดรถฟรีสำหรับลูกค้าทุกท่าน');
  }

  if (priceKeywords.some(k => text.includes(k))) {
    return replyText(event.replyToken, 'ปกติค่าเข้าสยามชัยหาดทรายขาว 40 บาท เด็กต่ำกว่า 10 ขวบและผู้สูงอายุฟรี\nทะเลนครปฐม ผู้ใหญ่ 120 บาท เด็กต่ำกว่า 10 ขวบ 60 บาท');
  }

  if (locationKeywords.some(k => text.includes(k))) {
    return replyText(event.replyToken, 'สยามชัยหาดทรายขาวตั้งอยู่ที่นครปฐม กดตามลิ้งค์นี้ได้เลย https://g.co/kgs/k1Zv8V2');
  }

  if (swimKeywords.some(k => text.includes(k))) {
    return replyText(event.replyToken, 'สามารถเล่นน้ำได้ถึงเวลา 18.00 น. หากอยากเล่นน้ำต่อสามารถเล่นที่หลังร้านอาหารสามชัยได้ถึง 21.00 น.');
  }

  if (foodKeywords.some(k => text.includes(k))) {
    return replyText(event.replyToken, 'สามารถนำอาหารเข้ามาได้ ยกเว้นเครื่องดื่ม ซึ่งไม่อนุญาตให้นำเข้ามา');
  }

  if (concertKeywords.some(k => text.includes(k))) {
    return replyText(event.replyToken, 'ลูกค้าสามารถเช็คกิจกรรมหรือคอนเสิร์ตได้ที่เพจ "สยามชัยหาดทรายขาว" บน Facebook');
  }

  if (petKeywords.some(k => text.includes(k))) {
    return replyText(event.replyToken, 'สามารถนำสัตว์เลี้ยงเข้ามาได้ โดยมีค่าบริการเท่ากับผู้ใหญ่ และไม่อนุญาตให้สัตว์เลี้ยงลงเล่นน้ำเด็ดขาด เพื่อความสะดวกของผู้ใช้บริการท่านอื่น');
  }

  if (aboutPlaceKeywords.some(k => text.includes(k))) {
    return replyText(event.replyToken, 'สยามชัยหาดทรายขาวเป็นสถานที่ท่องเที่ยวและพักผ่อนในจังหวัดนครปฐม มีบริการหลากหลายสำหรับนักท่องเที่ยว');
  }

  // กรณีไม่รู้คำตอบ ลองเช็คว่าผู้ใช้ถามเรื่องคำนวณราคาไหม
  const priceCalcResult = calculatePrice(event.message.text);
  if (priceCalcResult) {
    return replyText(event.replyToken, priceCalcResult);
  }

  // ตอบกลับข้อความพื้นฐานถ้าไม่มี keyword ตรงกัน
  return replyText(event.replyToken, 'ขอโทษครับ ผมไม่เข้าใจคำถาม กรุณาถามใหม่อีกครั้ง');
}

// ตั้งพอร์ตและเริ่มเซิร์ฟเวอร์
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
