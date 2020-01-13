[![Build Status](https://travis-ci.org/zinovik/ex-split-bot.svg?branch=master)](https://travis-ci.org/zinovik/ex-split-bot)

[![Netlify Status](https://api.netlify.com/api/v1/badges/b054f198-abad-43cb-8e9c-06251b61bb7d/deploy-status)](https://app.netlify.com/sites/ex-split-bot/deploys)

# ExSplitBot

This bot works in a Telegram group. When someone invites others to play, the bot sends a message with buttons to determine who will play and who pays for the game. Then the bot counts users' balances.

You can use it as Netlify Lambda Functions or as Okteto Kubernetes service.

## you can check how it works here

- Dev: https://ex-split-bot-zinovik.cloud.okteto.net
- Prod: https://ex-split-bot.netlify.com

## how to setup the bot

for the development

```bash
~/ngrok http 9000

curl https://api.telegram.org/bot<TELEGRAM_TOKEN>/setWebhook?url=https://<NGROK ID>.ngrok.io/index?token=<TOKEN>
```

for the production

Netlify:

```bash
curl https://api.telegram.org/bot<TELEGRAM_TOKEN>/setWebhook?url=https://ex-split-bot.netlify.com/.netlify/functions/index?token=<TOKEN>
```

Okteto:

```bash
curl https://api.telegram.org/bot<TELEGRAM_TOKEN>/setWebhook?url=https://ex-split-bot-zinovik.cloud.okteto.net/index?token=<TOKEN>
```

don't forget to add bot to the Telegram group and add set the administrator role

## 1. Working locally

### 1.1. create and fill .env file (use .env.example for help)

### 1.2. start the project

You can start project as server with db as docker containers:

```bash
docker-compose up
```

Or you can start db as docker container separately:

```bash
cd db
docker-compose up
```

and then start the project as lambda functions:

```bash
npm run start:lambda
```

or as a server:

```bash
npm run start
```

### 1.3. you can involve the functions locally

```bash
curl localhost:9000/index
curl localhost:9000/users
```

---

## 2. Working with Okteto Kubernetes

### 2.1. fill ConfigMap and Secret sections in the k8s.yml file

### 2.2. set Kubernetes configuration for the Okteto service

KUBECONFIG=~/Downloads/okteto-kube.config kubectl apply -f k8s.yml

### 2.3. connect to the Okteto Kubernetes Postgres database

KUBECONFIG=~/Downloads/okteto-kube.config kubectl port-forward service/postgres 9432:5432

### 2.4. get application logs from the Kubernetes Okteto service

KUBECONFIG=~/Downloads/okteto-kube.config kubectl logs service/ex-split-bot -f
