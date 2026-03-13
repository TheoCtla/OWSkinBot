import { Events, type Interaction } from 'discord.js';
import * as skinCommand from '../commands/skin.js';

export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction) {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'skin') {
            try {
                await skinCommand.execute(interaction);
            } catch (error) {
                console.error('Error executing /skin:', error);

                const errorMessage = {
                    content: '❌ Une erreur est survenue lors de l\'exécution de cette commande !',
                    flags: 64, // MessageFlags.Ephemeral
                };

                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(errorMessage);
                    } else {
                        await interaction.reply(errorMessage);
                    }
                } catch (replyError) {
                    console.error('Error sending error response:', replyError);
                }
            }
        }
    } else if (interaction.isAutocomplete()) {
        if (interaction.commandName === 'skin') {
            try {
                await skinCommand.autocomplete(interaction);
            } catch (error) {
                console.error('Error in autocomplete:', error);
            }
        }
    }
}
