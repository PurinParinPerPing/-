require('dotenv').config();

const express = require('express');
const line = require('@line/bot-sdk');

const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const client = new line.Client(config);

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

app.use(express.json());

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

function replyText(replyToken, text) {
  return client.replyMessage(replyToken, {
    type: 'text',
    text: text
  });
}

function handleEvent(event) {
  console.log('Received event:', JSON.stringify(event, null, 2));

  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const text = event.message.text.toLowerCase();

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

  const extraQuestions = [
    {
      keywords: ['เสียตรงนี้ต้องเสียเพิ่มไหม', 'ต้องเสียเพิ่มไหม', 'เสียเพิ่มไหม', 'มีค่าใช้จ่ายเพิ่มไหม','จ่ายเพิ่ม', 'จ่ายเพิ่มไหม','เสียเพิ่ม'],
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

  if (paymentKeywords.some(k => text.includes(k))) {
    return client.replyMessage(event.replyToken, {
      type: 'image',
      originalContentUrl: 'https://cdn.glitch.global/c0914ca7-8b8c-41a8-be31-f52cde5b3ea2/%E0%B8%AA%E0%B8%A5%E0%B8%B4%E0%B8%9B%E0%B9%80%E0%B8%88%E0%B9%89.jfif?v=1748077534886',
      previewImageUrl: 'https://cdn.glitch.global/c0914ca7-8b8c-41a8-be31-f52cde5b3ea2/%E0%B8%AA%E0%B8%A5%E0%B8%B4%E0%B8%9B%E0%B9%80%E0%B8%88%E0%B9%89.jfif?v=1748077534886'
    });
  }

  if (bookingKeywords.some(k => text.includes(k))) {
    return replyText(event.replyToken, 'คุณสามารถซื้อบัตรผ่านทาง LINE นี้ได้เลยค่ะ กรุณาแจ้งจำนวนผู้ใหญ่และเด็กที่ต้องการจองค่ะ');
  }

  if (openingKeywords.some(k => text.includes(k))) {
    return replyText(event.replyToken, 'เปิดให้บริการทุกวัน ตั้งแต่เวลา 08.00 - 00.00 น. ค่ะ');
  }

  if (parkingKeywords.some(k => text.includes(k))) {
    return replyText(event.replyToken, 'ทางเรามีที่จอดรถฟรีสำหรับลูกค้าทุกท่านค่ะ');
  }

  if (priceKeywords.some(k => text.includes(k))) {
    return replyText(event.replyToken, 'ค่าเข้าสยามชัยหาดทรายขาวสำหรับผู้ใหญ่ 40 บาท เด็กต่ำกว่า 10 ปี และผู้สูงอายุ เข้าฟรีค่ะ\nส่วนโซนทะเลนครปฐม ผู้ใหญ่ 120 บาท เด็ก 60 บาทค่ะ');
  }

  if (locationKeywords.some(k => text.includes(k))) {
    return replyText(event.replyToken, 'สยามชัยหาดทรายขาวตั้งอยู่ที่จังหวัดนครปฐมค่ะ สามารถกดดูแผนที่ได้ที่ https://g.co/kgs/k1Zv8V2');
  }

  if (swimKeywords.some(k => text.includes(k))) {
    return replyText(event.replyToken, 'สามารถเล่นน้ำได้ถึงเวลา 18.00 น. ค่ะ หากต้องการเล่นน้ำเพิ่มเติมสามารถเล่นบริเวณหลังร้านอาหารสามชัยได้ถึง 21.00 น. ค่ะ');
  }

  if (foodKeywords.some(k => text.includes(k))) {
    return replyText(event.replyToken, 'สามารถนำอาหารเข้ามาได้ค่ะ ยกเว้นเครื่องดื่มแอลกอฮอล์ซึ่งไม่อนุญาตให้นำเข้ามาค่ะ');
  }

  if (concertKeywords.some(k => text.includes(k))) {
    return replyText(event.replyToken, 'ลูกค้าสามารถติดตามกิจกรรมและคอนเสิร์ตได้ที่เพจ Facebook: "สยามชัยหาดทรายขาว" ค่ะ');
  }

  if (petKeywords.some(k => text.includes(k))) {
    return replyText(event.replyToken, 'สามารถนำสัตว์เลี้ยงเข้ามาได้ค่ะ โดยมีค่าบริการเท่ากับผู้ใหญ่ และกรุณาอย่าให้สัตว์เลี้ยงลงเล่นน้ำนะคะ');
  }

  if (aboutPlaceKeywords.some(k => text.includes(k))) {
    return replyText(event.replyToken, 'สยามชัยหาดทรายขาวเป็นสถานที่พักผ่อนหย่อนใจในจังหวัดนครปฐม มีโซนเล่นน้ำ ร้านอาหาร และกิจกรรมสำหรับครอบครัวค่ะ');
  }

  const priceCalcResult = calculatePrice(event.message.text);
  if (priceCalcResult) {
    return replyText(event.replyToken, priceCalcResult + '\nหากต้องการจอง กรุณาแจ้งเพื่อดำเนินการต่อได้เลยค่ะ');
  }

  return replyText(event.replyToken, 'ขออภัยค่ะ ไม่สามารถตอบคำถามนี้ได้ในขณะนี้ หากต้องการสอบถามเพิ่มเติม กรุณาระบุคำถามให้ชัดเจนขึ้นนะคะ');
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
