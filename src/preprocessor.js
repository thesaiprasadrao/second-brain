import { downloadMediaMessage } from '@whiskeysockets/baileys';
import Groq from 'groq-sdk';
import { Blob } from 'buffer';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function preprocess(msg) {
  const audio = msg.message?.audioMessage;
  const image = msg.message?.imageMessage;

  if (audio) return transcribeAudio(msg);
  if (image) return describeImage(msg);

  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    null
  );
}

async function transcribeAudio(msg) {
  const buffer = await downloadMediaMessage(msg, 'buffer', {});
  const blob = new Blob([buffer], { type: 'audio/ogg' });
  blob.name = 'voice.ogg';

  const result = await groq.audio.transcriptions.create({
    file: blob,
    model: 'whisper-large-v3-turbo',
  });

  return result.text?.trim() ?? null;
}

async function describeImage(msg) {
  const buffer = await downloadMediaMessage(msg, 'buffer', {});
  const base64 = buffer.toString('base64');
  const mimeType = msg.message.imageMessage.mimetype ?? 'image/jpeg';

  const result = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
          {
            type: 'text',
            text: 'Extract all text and key information from this image. Describe what it contains.',
          },
        ],
      },
    ],
  });

  return result.choices[0]?.message?.content?.trim() ?? null;
}
