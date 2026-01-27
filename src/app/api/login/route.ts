import type { NextApiRequest, NextApiResponse } from 'next';
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
import { APP_URL } from '../../../../src/lib/env';


import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();

  const thirdPartyResponse = await fetch(`${APP_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    console.log('thirdPartyResponse SERVER', thirdPartyResponse)
  const response = await thirdPartyResponse.json();
  console.log('response SERVER', response)
  return NextResponse.json({
    success: true,
    body
  });
}

// export default async function TelegramHandler(req: NextApiRequest, res: NextApiResponse) {
//   try {
//   const body = req.body;
//   console.log('body', body)
//   // // const thirdPartyResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
//   // //     method: 'POST',
//   // //     headers: {
//   // //       'Content-Type': 'application/json',
//   // //     },
//   // //     body: JSON.stringify({
//   // //       chat_id: CHAT_ID,
//   // //       text: `💬 Website:\n
//   // //         Ім'я: ${body.firstName}\r\n
//   // //         Пошта: ${body.email}\r\n
//   // //         Телефон: ${body.phone}\r\n
//   // //          ${body.text ? `Повідомлення: ${body.text}` : '' }
//   // //         `
//   // //     }),
//   // //   });
//   // const response = await thirdPartyResponse.json();

//   // if (thirdPartyResponse.status === 200) {
//   //     res.send({ ok: true });
//   // } else {
//   //   res.status(400).json({ status: 'BAD REQUEST', error: response });
//   // }
    
//   } catch(error) {
//     res.status(500).json({ status: 'BAD REQUEST' });
//   }
  
// };