import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import express from 'express';
import * as readyEvent from './events/ready.js';
import * as interactionCreateEvent from './events/interactionCreate.js';

// ── Mini serveur web pour Render.com ──
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (_req, res) => res.send('Bot is alive!'));

app.listen(port, () => {
    console.log(`Serveur web démarré sur le port ${port}`);
});

// ── Discord Bot ──
const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

// Register event handlers
client.once(readyEvent.name, (...args) => readyEvent.execute(...(args as [any])));
client.on(interactionCreateEvent.name, interactionCreateEvent.execute);

// Login
client.login(process.env.DISCORD_TOKEN);
