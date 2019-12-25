[![Build Status](https://travis-ci.org/zinovik/badminton-brest-bot.svg?branch=master)](https://travis-ci.org/zinovik/badminton-brest-bot)

[![Netlify Status](https://api.netlify.com/api/v1/badges/b054f198-abad-43cb-8e9c-06251b61bb7d/deploy-status)](https://app.netlify.com/sites/badminton-brest-bot/deploys)

# Badminton Brest Bot

This bot works in a Telegram group. When someone invites others to play, the bot sends a message with buttons to determine who will play and who pays for the game. Then the bot counts users' balances.

## 1. create and fill .env file (use .env.example for help)

## 2. start the project with the database in the docker container

```bash
docker-compose up
```

or start the database in the docker container and start the project without the database

```bash
cd db
docker-compose up

npm run start:lambda
```

or start the project only if you have Postgres database installed

```bash
npm run start:lambda
```

## 3. setup the bot for development

```bash
~/ngrok http 9000

curl https://api.telegram.org/bot<TELEGRAM_TOKEN>/setWebhook?url=https://<NGROK ID>.ngrok.io/index?token=<TOKEN>
```

or setup the bot for production, for example:

```bash
curl https://api.telegram.org/bot<TELEGRAM_TOKEN>/setWebhook?url=https://badminton-brest-bot.netlify.com/.netlify/functions/index?token=<TOKEN>
```

don't forget to add bot to the Telegram group and add set the administrator role

## 4. you can involve the functions locally

```bash
curl localhost:9000/index
curl localhost:9000/users
```

## 5. you can check how it works here

Dev: https://badminton-brest-bot-zinovik.cloud.okteto.net/users
Prod: https://badminton-brest-bot.netlify.com/.netlify/functions/users

---

## 6. set kubernetes configuration for the okteto service

KUBECONFIG=~/Downloads/okteto-kube.config kubectl apply -f k8s.yml

## 7. connect to the kubernetes okteto postgres database

KUBECONFIG=~/Downloads/okteto-kube.config kubectl port-forward deployment/postgres 9432:5432

## 8. get application logs from the kubernetes okteto service

KUBECONFIG=~/Downloads/okteto-kube.config kubectl logs deployment/badminton-brest-bot -f
