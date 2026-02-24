import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
    AutocompleteInteraction
} from 'discord.js';
import db from '../api/config/db.js';
import { HeroRepository } from '../api/repositories/HeroRepository.js';
import { SkinRepository } from '../api/repositories/SkinRepository.js';
import { HeroService } from '../api/services/HeroService.js';
import { SkinService } from '../api/services/SkinService.js';

// ── Dependency injection ──
const heroService = new HeroService(new HeroRepository(db));
const skinService = new SkinService(new SkinRepository(db));

const BASE_URL = 'https://eu.battle.net/shop/en/checkout/buy';

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

    let heroes = await heroService.getAllHeroes();

    if (focusedValue) {
        heroes = heroes.filter(h => h.name.toLowerCase().includes(focusedValue));
    }

    const choices = heroes
        .slice(0, 25)
        .map(h => ({ name: h.name, value: h.name }));

    await interaction.respond(choices);
}

export async function execute(interaction: ChatInputCommandInteraction) {
    const heroInput = interaction.options.getString('hero', true);

    const hero = await heroService.getHeroByName(heroInput);

    if (!hero) {
        return interaction.reply({
            content: ` Aucun héros nommé "**${heroInput}**" n'a été trouvé dans la base de données.`,
            flags: 64,
        });
    }

    const allSkins = await skinService.getAllSkins({ heroId: hero.id });
    const activeSkins = allSkins.filter(s => s.is_active === 1);

    if (activeSkins.length === 0) {
        return interaction.reply({
            content: `⚠️ Il n'y a actuellement aucun code de skin actif disponible pour **${hero.name}**.`,
            flags: 64,
        });
    }

    const skinLines = activeSkins
        .map(skin => `[${skin.name}](${BASE_URL}/${skin.code}) — ( ${skin.code} )`)
        .join('\n');

    const embed = new EmbedBuilder()
        .setTitle(`Codes de skin actifs — ${hero.name}`)
        .setColor('#F99E1A')
        .setDescription(skinLines)
        .setFooter({ text: `${activeSkins.length} skin(s) actif(s) trouvé(s)` });

    await interaction.reply({ embeds: [embed] });
}
