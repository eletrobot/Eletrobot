import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import {
  extractIncomingMessages,
  verifyWebhookSignature,
} from '../src/whatsapp.js';

test('valida a assinatura HMAC da Meta', () => {
  const body = Buffer.from('{"object":"whatsapp_business_account"}');
  const secret = 'test-secret';
  const digest = createHmac('sha256', secret).update(body).digest('hex');

  assert.equal(verifyWebhookSignature(body, `sha256=${digest}`, secret), true);
  assert.equal(verifyWebhookSignature(body, `sha256=${digest}`, 'wrong'), false);
  assert.equal(verifyWebhookSignature(body, 'invalid', secret), false);
});

test('extrai mensagens recebidas e ignora atualizações de status', () => {
  const payload = {
    entry: [
      {
        changes: [
          {
            field: 'messages',
            value: { messages: [{ from: '5567999999999', type: 'text' }] },
          },
          { field: 'statuses', value: { statuses: [{ id: 'message-id' }] } },
        ],
      },
    ],
  };

  assert.deepEqual(extractIncomingMessages(payload), [
    { from: '5567999999999', type: 'text' },
  ]);
});