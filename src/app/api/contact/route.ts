import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const TELEGRAM_CAPTION_MAX_LENGTH = 1024;

export async function POST(request: Request) {
  let name: string;
  let email: string;
  let subject: string;
  let message: string;
  let imageFile: File | null = null;

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    name = (formData.get('name') as string)?.trim() || '';
    email = (formData.get('email') as string)?.trim() || '';
    subject = (formData.get('subject') as string)?.trim() || '';
    message = (formData.get('message') as string)?.trim() || '';
    const image = formData.get('image');
    if (image instanceof File && image.size > 0) {
      if (!image.type.startsWith('image/')) {
        logger.warn({ type: image.type }, 'Contact form: rejected non-image file');
        return NextResponse.json(
          { success: false, error: 'Invalid file type. Only images are allowed.' },
          { status: 400 }
        );
      }
      if (image.size > MAX_IMAGE_SIZE_BYTES) {
        logger.warn({ size: image.size }, 'Contact form: image too large');
        return NextResponse.json(
          { success: false, error: 'Image is too large. Maximum size is 10 MB.' },
          { status: 400 }
        );
      }
      imageFile = image;
    }
  } else {
    const body = await request.json();
    name = (body.name as string)?.trim() || '';
    email = (body.email as string)?.trim() || '';
    subject = (body.subject as string)?.trim() || '';
    message = (body.message as string)?.trim() || '';
  }

  if (!name || !email || !message) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Contact form requires Telegram env vars; return 503 so frontend can show "temporarily unavailable"
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    logger.warn('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured; contact form unavailable');
    return NextResponse.json(
      { success: false, error: 'Contact form is not configured' },
      { status: 503 }
    );
  }

  const text = [
    '🔔 FoxyPlay Support Ticket',
    '',
    `👤 Name: ${name}`,
    `📧 Email: ${email}`,
    `📋 Subject: ${subject || '(not specified)'}`,
    '',
    'Message:',
    message,
  ].join('\n');

  try {
    if (imageFile) {
      // Read file into buffer and send as Blob so the outgoing request serializes correctly (File from request may not)
      const arrayBuffer = await imageFile.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: imageFile.type || 'image/jpeg' });
      const formData = new FormData();
      formData.append('chat_id', TELEGRAM_CHAT_ID);
      const caption =
        text.length <= TELEGRAM_CAPTION_MAX_LENGTH ? text : text.slice(0, TELEGRAM_CAPTION_MAX_LENGTH - 1) + '…';
      formData.append('caption', caption);
      formData.append('photo', blob, imageFile.name || 'image.jpg');

      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const rawBody = await res.text();
      let data: { ok?: boolean; description?: string };
      try {
        data = JSON.parse(rawBody);
      } catch {
        logger.warn({ status: res.status, body: rawBody.slice(0, 500) }, 'Telegram sendPhoto non-JSON response');
        return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
      }
      if (!res.ok || !data.ok) {
        logger.warn({ ok: data.ok, description: data.description, status: res.status }, 'Telegram sendPhoto failed');
        return NextResponse.json({ success: false, error: data.description || 'Failed to send message' }, { status: 500 });
      }
      logger.info({ hasImage: true }, 'Contact form submitted via sendPhoto');
    } else {
      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text,
          }),
        }
      );

      const rawBody = await res.text();
      let data: { ok?: boolean; description?: string };
      try {
        data = JSON.parse(rawBody);
      } catch {
        logger.warn({ status: res.status, body: rawBody.slice(0, 500) }, 'Telegram sendMessage non-JSON response');
        return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
      }
      if (!res.ok || !data.ok) {
        logger.warn({ ok: data.ok, description: data.description, status: res.status }, 'Telegram sendMessage failed');
        return NextResponse.json({ success: false, error: data.description || 'Failed to send message' }, { status: 500 });
      }
      logger.info('Contact form submitted via sendMessage');
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error(err, 'Contact API error');
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
  }
}
