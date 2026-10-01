# Eletrobot

[Fale comigo pelo WhatsApp](https://wa.me/message/6QHYSO2UCX5OD1)

## Bot de WhatsApp

Este projeto recebe mensagens pela WhatsApp Business Cloud API e responde com o texto definido em `WHATSAPP_AUTO_REPLY`.

### Requisitos

- Node.js 20.6 ou mais recente.
- Um aplicativo configurado no Meta for Developers com WhatsApp habilitado.
- Um token de acesso, o ID do número de telefone e o segredo do aplicativo.

### Configuração local

1. Copie `.env.example` para `.env`.
2. No `.env`, preencha `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` e `META_APP_SECRET` com os valores do painel da Meta. Defina também um valor secreto para `WHATSAPP_VERIFY_TOKEN`.
3. Personalize `WHATSAPP_AUTO_REPLY` com a resposta que o bot deve enviar.
4. Execute `npm start` para iniciar o servidor na porta 3000. `npm test` executa os testes.

Não publique o arquivo `.env` nem compartilhe tokens ou segredos. O `.env` já está ignorado pelo Git.

### Conectar à Meta

O webhook precisa estar publicado em uma URL HTTPS acessível pela internet; `localhost` sozinho não funciona. Configure essa URL com o caminho `/webhook` no painel do aplicativo Meta, use o mesmo valor de `WHATSAPP_VERIFY_TOKEN` e assine o campo `messages`. O endpoint `/health` permite verificar se o servidor está ativo.

Comece com o número de teste fornecido pela Meta. Antes de registrar seu número pessoal na plataforma, confira as regras atuais de migração e coexistência: isso pode afetar como ele funciona no aplicativo WhatsApp.
