import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyWebhookSignature(rawBody, signature, appSecret) {
  if (typeof signature !== 'string' || !signature.startsWith('sha256=')) {
    return false;
  }

  const receivedDigest = signature.slice('sha256='.length);
  if (!/^[a-f0-9]{64}$/i.test(receivedDigest)) {
    return false;
  }

  const expectedDigest = createHmac('sha256', appSecret)
    .update(rawBody)
    .digest();
  const providedDigest = Buffer.from(receivedDigest, 'hex');

  return timingSafeEqual(providedDigest, expectedDigest);
}

export function extractIncomingMessages(payload) {
  return (payload.entry ?? []).flatMap((entry) =>
    (entry.changes ?? [])
      .filter((change) => change.field === 'messages')
      .flatMap((change) => change.value?.messages ?? [])
      .filter((message) => typeof message.from === 'string'),
  );
}

export async function sendTextMessage({
  accessToken,
  phoneNumberId,
  recipient,
  text,
  apiVersion,
}) {
  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(phoneNumberId)}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'text',
        text: { preview_url: false, body: text },
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`WhatsApp API respondeu ${response.status}: ${details}`);
  }
}