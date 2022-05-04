# nyaasi-tracker-bot

A Discord Bot that tracks [nyaa.si](https://nyaa.si/)'s RSS feeds and sends an update to
a channel when it matches a subscription.

## Prerequisites

- A [MongoDB](https://www.mongodb.com/) instance. You can use either:
  - A cloud instance using [MongoDB Atlas](https://www.mongodb.com/atlas).
  - A local container using [Docker](https://hub.docker.com/_/mongo).
  - A local MongoDB setup.
- [NodeJS](https://nodejs.org/) >= v18.0.0
- A [Discord Bot](https://discord.com/developers/applications) Application

## Setup

With a fresh copy of the project, copy the `.env.sample` and rename it to `.env`.
`.env` is just a text file, so edit the contents of `.env` by following the instructions
inside.

> Tip: The lines starting with `#` are comments, so you only need to edit the lines
> that doesn't start with it.

Then, run the following commands in your terminal:

```sh
# This downloads the Package Manager used by the project (Yarn),
# Installs dependencies, creates the database schema, builds the bot,
# and registers the commands to Discord
> npm run init
```

When the command finishes, run this command to start your bot:

```sh
# Starts your bot
> yarn start
```

To setup the bot to start automatically when your system starts,
you can use [PM2](https://pm2.keymetrics.io/):

```sh
# Install PM2
> npm i -g pm2

# This line will give you a command to setup autostart on your system
> pm2 autostart

# Start your bot
> pm2 start ecosystem.config.yml

# Save your running applications so PM2 can run it on startup
> pm2 save
```

## Development

In your terminal, run:

```sh
> yarn dev
```

Make your changes and add the features you want.
