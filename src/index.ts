import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import './api/server.js';
import * as readyEvent from './events/ready.js';
import * as interactionCreateEvent from './events/interactionCreate.js';

// ── Discord Bot ──
const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

// Register event handlers
client.once(readyEvent.name, (...args) => readyEvent.execute(...(args as [any])));
client.on(interactionCreateEvent.name, interactionCreateEvent.execute);

// Login
client.login(process.env.DISCORD_TOKEN);
