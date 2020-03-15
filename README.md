[![Build Status](https://travis-ci.org/zinovik/ex-split-bot.svg?branch=master)](https://travis-ci.org/zinovik/ex-split-bot)

[![Netlify Status](https://api.netlify.app/api/v1/badges/b054f198-abad-43cb-8e9c-06251b61bb7d/deploy-status)](https://app.netlify.app/sites/ex-split-bot/deploys)

![logo](./avatar/exsplitbot.jpg)

# ExSplitBot

This bot works in a Telegram group. When someone invites others to split expense, the bot sends a message with buttons to determine who will split and who pays for the expense. Then the bot counts users' balances.

You can use it as server - entrypoint src/server.js (for example, as Okteto Kubernetes service) or serverless - entrypoint src/lambda (for example, as Netlify Lambda Functions).

## you can check how it works here

Dev ([@ExSplitDevBot](https://t.me/exsplitdevbot)):

1. https://t.me/exsplitdev

   - https://app-ex-split-dev-bot-zinovik.cloud.okteto.net?group=exsplitdev

2. https://t.me/exsplitdev2

   - https://app-ex-split-dev-bot-zinovik.cloud.okteto.net?group=exsplitdev2

3. https://t.me/exsplitdev3

   - https://app-ex-split-dev-bot-zinovik.cloud.okteto.net?group=exsplitdev3

---

## 0. Setting the bot

### 0.1. for the development

```bash
~/ngrok http 9000

curl https://api.telegram.org/bot<TELEGRAM_TOKEN>/setWebhook?url=https://<NGROK ID>.ngrok.io/index?token=<TOKEN>
```

### 0.2. for the production

Okteto Kubernetes service:

```bash
curl https://api.telegram.org/bot<TELEGRAM_TOKEN>/setWebhook?url=https://app-ex-split-bot-zinovik.cloud.okteto.net/index?token=<TOKEN>
```

Netlify Lambda Functions:

```bash
curl https://api.telegram.org/bot<TELEGRAM_TOKEN>/setWebhook?url=https://ex-split-bot.netlify.app/.netlify/functions/index?token=<TOKEN>
```

don't forget to add the bot to the Telegram group, set the administrator role, and disable privacy mode in bot settings!

---

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

and then start the project as a server:

```bash
npm run start:dev
```

or as lambda functions:

```bash
npm run start:lambda
```

### 1.3. you can involve the functions locally

```bash
curl localhost:9000/index
curl localhost:9000/users
curl localhost:9000/groups
curl localhost:9000/expenses
```

---

## 2. Working with Okteto Kubernetes service

### 2.1. download okteto-kube.config file

### 2.1. fill ConfigMap and Secret sections in the k8s.yml file

### 2.2. set Kubernetes configuration for the Okteto service

KUBECONFIG=okteto-kube.config kubectl apply -f k8s.yml

---

## 3. Useful Okteto Kubernetes service commands

### 3.1. connect to the Okteto Kubernetes Postgres database (you can use it instead of docker db locally)

KUBECONFIG=okteto-kube.config kubectl port-forward service/postgres 9432:5432

### 3.2. get application logs from the Kubernetes Okteto service (debugging)

KUBECONFIG=okteto-kube.config kubectl logs service/app -f

### 3.3. update deployment on the Kubernetes Okteto service (after updating image)

KUBECONFIG=okteto-kube.config kubectl rollout restart deployment.apps/ex-split-bot

## P. S.

SQL to change expense auto increment last number:

```sql
create sequence expense_id_seq;
alter table expense alter id set default nextval('expense_id_seq');
select setval('expense_id_seq', 99, true);
```
