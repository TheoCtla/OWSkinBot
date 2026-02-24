import { Client, TextChannel } from 'discord.js';
import db from '../api/config/db.js';
import { SkinRepository } from '../api/repositories/SkinRepository.js';
import { SkinService } from '../api/services/SkinService.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const BASE_URL = 'https://eu.battle.net/shop/en/checkout/buy';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ANSI color codes
const GREEN = '\x1b[32m';
const ORANGE = '\x1b[33m';
const RESET = '\x1b[0m';

// Strict browser-like headers
const BROWSER_HEADERS: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
};

const MAX_REDIRECTS = 10;

// ── Dependency injection ──
const skinService = new SkinService(new SkinRepository(db));

/**
 * Manually follows the redirect chain to find the final Location.
 */
async function followRedirects(url: string, cookie: string): Promise<{ finalUrl: string; status: number }> {
    let currentUrl = url;

    for (let i = 0; i < MAX_REDIRECTS; i++) {
        const response = await fetch(currentUrl, {
            method: 'GET',
            redirect: 'manual',
            headers: {
                ...BROWSER_HEADERS,
                'Cookie': cookie,
            },
        });

        const status = response.status;

        if (status !== 301 && status !== 302 && status !== 303 && status !== 307 && status !== 308) {
            return { finalUrl: currentUrl, status };
        }

        const location = response.headers.get('location');
        if (!location) {
            return { finalUrl: currentUrl, status };
        }

        if (location.startsWith('/')) {
            const urlObj = new URL(currentUrl);
            currentUrl = `${urlObj.origin}${location}`;
        } else {
            currentUrl = location;
        }
    }

    return { finalUrl: currentUrl, status: 0 };
}

let discordClient: Client | null = null;

async function sendNotification(message: string) {
    if (!discordClient) return;
    const channelId = process.env.NOTIFICATION_CHANNEL_ID;
    if (!channelId) {
        console.warn('[LinkChecker] NOTIFICATION_CHANNEL_ID not set – cannot send Discord notification.');
        return;
    }
    try {
        const channel = await discordClient.channels.fetch(channelId);
        if (channel && channel.isTextBased()) {
            await (channel as TextChannel).send(message);
        }
    } catch (err) {
        console.error('[LinkChecker] Failed to send Discord notification:', err);
    }
}

async function runLinkCheckCycle() {
    console.log('[LinkChecker] Cycle starting...');

    // ── 1. Retrieve the Battle.net session cookie ──
    const bnetCookie = process.env.BNET_COOKIE;
    if (!bnetCookie) {
        console.error('[LinkChecker] ❌ BNET_COOKIE is not set in .env – skipping this cycle entirely.');
        await sendNotification('⚠️ **LinkChecker** : `BNET_COOKIE` non défini dans `.env` – cycle ignoré.');
        return;
    }

    // ── 2. Get all skins from Turso ──
    const allSkins = await skinService.getAllSkins();
    const totalCodes = allSkins.length;
    let updatedCount = 0;

    for (let i = 0; i < totalCodes; i++) {
        const skin = allSkins[i];
        const currentIndex = i + 1;
        const skinUrl = `${BASE_URL}/${skin.code}`;

        try {
            await delay(100);

            const { finalUrl, status } = await followRedirects(skinUrl, bnetCookie);

            // ── 3a. Cookie expired / invalid → ABORT ──
            if (finalUrl.includes('login') || finalUrl.includes('account.battle.net')) {
                console.error('[LinkChecker] ⛔ Cookie expired or invalid! Final URL redirected to login:');
                console.error(`   → ${finalUrl}`);
                console.error('[LinkChecker] Aborting cycle – no changes will be saved.');
                await sendNotification('⛔ **LinkChecker** : Cookie Battle.net expiré ou invalide !\nMets à jour `BNET_COOKIE` dans `.env` et relance le bot.');
                return;
            }

            // ── 3b. 404 → product gone ──
            if (status === 404) {
                const wasActive = skin.is_active === 1;
                if (wasActive) {
                    await skinService.updateSkin(skin.code, { is_active: 0 });
                    updatedCount++;
                }
                console.log(`[LinkChecker] Code ${currentIndex}/${totalCodes} | ${skin.code} | ${skin.name} | ${wasActive ? `${GREEN}BDD modifiée${RESET}` : `${ORANGE}pas modifié${RESET}`}`);
                continue;
            }

            let isAlive: number | null = null;

            // ── 3c. Checkout page reached → product exists ──
            if (finalUrl.includes('checkout')) {
                isAlive = 1;
            }
            // ── 3d. Redirected to generic shop → product is gone ──
            else if (finalUrl.includes('shop.battle.net')) {
                isAlive = 0;
            }
            // ── 3e. Unexpected → log and skip ──
            else {
                console.log(`[LinkChecker] Code ${currentIndex}/${totalCodes} | ${skin.code} | ${skin.name} | ${ORANGE}pas modifié (URL inattendue)${RESET}`);
                continue;
            }

            // ── 4. Update status if it changed ──
            const modified = skin.is_active !== isAlive;
            if (modified) {
                await skinService.updateSkin(skin.code, { is_active: isAlive });
                updatedCount++;
            }

            console.log(`[LinkChecker] Code ${currentIndex}/${totalCodes} | ${skin.code} | ${skin.name} | ${modified ? `${GREEN}BDD modifiée${RESET}` : `${ORANGE}pas modifié${RESET}`}`);
        } catch (error) {
            console.error(`[LinkChecker] Fetch error for ${skin.hero_name}/${skin.name}:`, error);
        }
    }

    // ── 5. Summary ──
    if (updatedCount > 0) {
        console.log(`[LinkChecker]  Cycle terminé. ${updatedCount} skin(s) mis à jour dans la BDD.`);
    } else {
        console.log(`[LinkChecker]  Cycle terminé. Aucune modification.`);
    }
}

/**
 * Starts the background link checker task.
 * Schedules the check to run every day at midnight (00:00).
 */
export function startLinkChecker(client: Client) {
    discordClient = client;

    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = nextMidnight.getTime() - now.getTime();

    console.log(`[LinkChecker] Background service started. Prochain scrape à minuit (dans ${Math.round(msUntilMidnight / 60000)} min).`);

    setTimeout(() => {
        runLinkCheckCycle();
        setInterval(runLinkCheckCycle, ONE_DAY_MS);
    }, msUntilMidnight);
}
