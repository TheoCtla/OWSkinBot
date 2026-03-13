import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import './api/server.js';
import * as readyEvent from './events/ready.js';
import * as interactionCreateEvent from './events/interactionCreate.js';

// ── Validate required env vars at startup ──
const requiredEnvVars = ['DISCORD_TOKEN', 'GUILD_ID', 'TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN'] as const;
for (const key of requiredEnvVars) {
    if (!process.env[key]) {
        console.error(`❌ Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

// ── Global error handlers ──
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});

// ── Discord Bot ──
const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

// Register event handlers
client.once(readyEvent.name, (...args) => readyEvent.execute(...(args as [any])));
client.on(interactionCreateEvent.name, interactionCreateEvent.execute);

// Handle Discord client errors
client.on('error', (error) => {
    console.error('Discord client error:', error);
});

client.on('shardError', (error) => {
    console.error('Discord websocket error:', error);
});

// Login
client.login(process.env.DISCORD_TOKEN).catch((error) => {
    console.error('Failed to login to Discord:', error);
    process.exit(1);
});
