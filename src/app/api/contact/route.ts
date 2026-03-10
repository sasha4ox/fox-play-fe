import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
/** Keep under typical serverless body limit (e.g. Vercel 4.5 MB) including multipart overhead */
const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB
const TELEGRAM_CAPTION_MAX_LENGTH = 1024;
const REQUEST_BODY_LIMIT_BYTES = 4.5 * 1024 * 1024; // 4.5 MB

/** Build multipart/form-data body for Telegram sendPhoto (avoids FormData in serverless fetch). */
function buildSendPhotoBody(chatId: string, caption: string, imageBuffer: Buffer, mimeType: string, filename: string): { body: Buffer; contentType: string } {
  const boundary = '----FoxyPlayContact' + Math.random().toString(36).slice(2);
  const b = (s: string, enc?: BufferEncoding) => Buffer.from(s, enc ?? 'utf8');
  const crlf = '\r\n';
  const parts: Buffer[] = [];

  const pushTextPart = (name: string, value: string) => {
    parts.push(b(`--${boundary}${crlf}`));
    parts.push(b(`Content-Disposition: form-data; name="${name}"${crlf}${crlf}`));
    parts.push(b(value));
    parts.push(b(crlf));
  };

  const pushFilePart = (name: string, value: Buffer, filename: string, contentType: string) => {
    parts.push(b(`--${boundary}${crlf}`));
    parts.push(b(`Content-Disposition: form-data; name="${name}"; filename="${filename}"${crlf}`));
    parts.push(b(`Content-Type: ${contentType}${crlf}${crlf}`));
    parts.push(value);
    parts.push(b(crlf));
  };

  pushTextPart('chat_id', chatId);
  pushTextPart('caption', caption);
  pushFilePart('photo', imageBuffer, filename, mimeType || 'image/jpeg');
  parts.push(b(`--${boundary}--${crlf}`));

  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

export async function POST(request: Request) {
  let name: string;
  let email: string;
  let subject: string;
  let message: string;
  let imageFile: File | null = null;

  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (!Number.isNaN(size) && size > REQUEST_BODY_LIMIT_BYTES) {
      logger.warn({ size, limit: REQUEST_BODY_LIMIT_BYTES }, 'Contact API: request body too large');
      return NextResponse.json(
        { success: false, error: 'Request too large. Please use an image under 4 MB or send without an image.' },
        { status: 413 }
      );
    }
  }

  try {
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
            { success: false, error: 'Image is too large. Maximum size is 4 MB.' },
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
  } catch (err) {
    const errMsg = (err as Error)?.message ?? String(err);
    const stack = (err as Error)?.stack;
    const contentType = request.headers.get('content-type') ?? '';
    logger.error({ err, message: errMsg, stack, contentType }, 'Contact API: failed to parse request body');
    return NextResponse.json(
      { success: false, error: 'Invalid request or failed to read form. Please try again.' },
      { status: 500 }
    );
  }

  if (!name || !email || !message) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

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
      let imageBuffer: Buffer;
      try {
        const arrayBuffer = await imageFile.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
      } catch (imgErr) {
        const msg = (imgErr as Error)?.message ?? String(imgErr);
        logger.error({ err: imgErr, message: msg }, 'Contact API: failed to read image file');
        return NextResponse.json(
          { success: false, error: 'Failed to process image. Try a smaller file or send without an image.' },
          { status: 500 }
        );
      }
      const caption =
        text.length <= TELEGRAM_CAPTION_MAX_LENGTH ? text : text.slice(0, TELEGRAM_CAPTION_MAX_LENGTH - 1) + '…';
      const mimeType = imageFile.type || 'image/jpeg';
      const filename = imageFile.name && /\.(jpe?g|png|gif|webp)$/i.test(imageFile.name) ? imageFile.name : 'image.jpg';
      const { body, contentType } = buildSendPhotoBody(TELEGRAM_CHAT_ID, caption, imageBuffer, mimeType, filename);

      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': contentType, 'Content-Length': String(body.length) },
        body: body as unknown as BodyInit,
      });

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
        return NextResponse.json(
          { success: false, error: data.description || 'Failed to send message' },
          { status: 500 }
        );
      }
      logger.info({ hasImage: true }, 'Contact form submitted via sendPhoto');
    } else {
      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
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
        const telegramError = data.description || 'Unknown Telegram error';
        logger.warn(
          { ok: data.ok, description: telegramError, status: res.status, rawBody: rawBody.slice(0, 300) },
          'Telegram sendMessage failed'
        );
        return NextResponse.json(
          { success: false, error: telegramError },
          { status: 500 }
        );
      }
      logger.info('Contact form submitted via sendMessage');
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const errMsg = (err as Error)?.message ?? String(err);
    const stack = (err as Error)?.stack;
    logger.error({ err, message: errMsg, stack }, 'Contact API error');
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send message. Please try again later or contact support by email.',
      },
      { status: 500 }
    );
  }
}
