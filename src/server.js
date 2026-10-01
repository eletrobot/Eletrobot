import { createServer } from 'node:http';
import {
  extractIncomingMessages,
  sendTextMessage,
  verifyWebhookSignature,
} from './whatsapp.js';

const requiredVariables = [
  'WHATSAPP_VERIFY_TOKEN',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'META_APP_SECRET',
];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);

if (missingVariables.length > 0) {
  console.error(`Configure estas variáveis no arquivo .env: ${missingVariables.join(', ')}`);
  process.exit(1);
}

const config = {
  port: Number(process.env.PORT ?? 3000),
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  appSecret: process.env.META_APP_SECRET,
  apiVersion: process.env.WHATSAPP_API_VERSION ?? 'v23.0',
  autoReply: process.env.WHATSAPP_AUTO_REPLY
    ?? 'Olá! Sou o assistente virtual da Eletrobot. Recebi sua mensagem.',
};
const maxBodySize = 1_000_000;
const processedMessageIds = new Set();

if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
  console.error('A variável PORT precisa ser uma porta entre 1 e 65535.');
  process.exit(1);
}

async function readRawBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodySize) {
      const error = new Error('Webhook excedeu o limite permitido.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function processMessages(payload) {
  for (const message of extractIncomingMessages(payload)) {
    if (message.id && processedMessageIds.has(message.id)) {
      continue;
    }

    if (message.id) {
      processedMessageIds.add(message.id);
      if (processedMessageIds.size > 5000) {
        processedMessageIds.delete(processedMessageIds.values().next().value);
      }
    }

    try {
      await sendTextMessage({
        accessToken: config.accessToken,
        phoneNumberId: config.phoneNumberId,
        recipient: message.from,
        text: config.autoReply,
        apiVersion: config.apiVersion,
      });
      console.log(`Resposta enviada para ${message.from}.`);
    } catch (error) {
      console.error(`Falha ao responder ${message.from}: ${error.message}`);
    }
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);

  if (request.method === 'GET' && url.pathname === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (url.pathname !== '/webhook') {
    response.writeHead(404).end('Not found');
    return;
  }

  if (request.method === 'GET') {
    const isValidRequest = url.searchParams.get('hub.mode') === 'subscribe'
      && url.searchParams.get('hub.verify_token') === config.verifyToken;

    if (!isValidRequest) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end(url.searchParams.get('hub.challenge') ?? '');
    return;
  }

  if (request.method !== 'POST') {
    response.writeHead(405, { Allow: 'GET, POST' }).end('Method not allowed');
    return;
  }

  try {
    const rawBody = await readRawBody(request);
    const signature = request.headers['x-hub-signature-256'];

    if (!verifyWebhookSignature(rawBody, signature, config.appSecret)) {
      response.writeHead(401).end('Invalid signature');
      return;
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      response.writeHead(400).end('Invalid JSON');
      return;
    }

    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end('EVENT_RECEIVED');
    void processMessages(payload);
  } catch (error) {
    if (!response.headersSent) {
      response.writeHead(error.statusCode ?? 500).end('Webhook error');
    }
    console.error(error.message);
  }
});

server.listen(config.port, '0.0.0.0', () => {
  console.log(`Webhook ativo na porta ${config.port}.`);
});