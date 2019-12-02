[![Build Status](https://travis-ci.org/zinovik/badminton-brest-bot.svg?branch=master)](https://travis-ci.org/zinovik/badminton-brest-bot)

[![Netlify Status](https://api.netlify.com/api/v1/badges/b054f198-abad-43cb-8e9c-06251b61bb7d/deploy-status)](https://app.netlify.com/sites/badminton-brest-bot/deploys)

**working**

1. fill .env

2. start project

npm run start:lambda

3. setup bot

```bash
curl https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://badminton-brest-bot.netlify.com/.netlify/functions/index
```

**testing**

```bash
curl localhost:9000/index
curl https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<NGROK ID>.ngrok.io/index
~/ngrok http 9000
```
