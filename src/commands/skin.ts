import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
    AutocompleteInteraction
} from 'discord.js';
import { getSkins } from '../utils/dataManager.js';

export const data = new SlashCommandBuilder()
    .setName('skin')
    .setDescription('Recherche un skin pour un héros spécifique')
    .addStringOption(option =>
        option.setName('hero')
            .setDescription('Le nom du héros Overwatch')
            .setRequired(true)
            .setAutocomplete(true)
    );

export async function autocomplete(interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const db = await getSkins();

    // Get all hero names
    let heroes = Object.keys(db);

    // Filter matching heroes with what the user is typing
    if (focusedValue) {
        heroes = heroes.filter(choice => choice.toLowerCase().includes(focusedValue));
    }

    // Discord only allows up to 25 autocomplete choices
    const choices = heroes
        .slice(0, 25)
        .map(hero => ({ name: hero, value: hero }));

    await interaction.respond(choices);
}

export async function execute(interaction: ChatInputCommandInteraction) {
    const heroInput = interaction.options.getString('hero', true);
    const db = await getSkins();

    // Case-insensitive hero lookup
    const heroKey = Object.keys(db).find(k => k.toLowerCase() === heroInput.toLowerCase());
    const heroSkins = heroKey ? db[heroKey] : undefined;

    if (!heroKey || !heroSkins || heroSkins.length === 0) {
        return interaction.reply({
            content: ` Aucun héros nommé "**${heroInput}**" n'a été trouvé dans la base de données.`,
            flags: 64, // MessageFlags.Ephemeral
        });
    }

    const activeSkins = heroSkins.filter((skin: any) => skin.is_active);

    if (activeSkins.length === 0) {
        return interaction.reply({
            content: `⚠️ Il n'y a actuellement aucun code de skin actif disponible pour **${heroKey}**.`,
            flags: 64, // MessageFlags.Ephemeral
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(`Skins disponibles pour ${heroKey.toUpperCase()}`)
        .setColor('#F99E1A') // Overwatch Orange Color
        .setDescription(
            activeSkins.map((skin: any) => `> **[${skin.name}](${skin.url})** | \`${skin.code}\``).join('\n\n')
        )
        .setFooter({ text: `${activeSkins.length} skin(s) actif(s) trouvé(s)` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
