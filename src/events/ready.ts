import { Events, type Client } from 'discord.js';
import { REST, Routes } from 'discord.js';
import * as skinCommand from '../commands/skin.js';
import { startLinkChecker } from '../services/linkChecker.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client<true>) {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    // Register slash commands for the specified guild
    const guildId = process.env.GUILD_ID;
    if (!guildId) {
        console.error('GUILD_ID is not set in .env');
        return;
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

    try {
        console.log('Started refreshing application (/) commands...');
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, guildId),
            { body: [skinCommand.data.toJSON()] }
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }

    // Start the background link checker
    startLinkChecker(client);
}
