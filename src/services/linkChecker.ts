import { getSkins, saveSkins } from '../utils/dataManager.js';
import { Client, TextChannel } from 'discord.js';

// 12 hours interval in milliseconds
const CHECK_INTERVAL = 12 * 60 * 60 * 1000;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ANSI color codes
const GREEN = '\x1b[32m';
const ORANGE = '\x1b[33m';
const RESET = '\x1b[0m';

// Strict browser-like headers
const HEADERS: Record<string, string> = {
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

/**
 * Manually follows the redirect chain to find the final Location.
 * Returns { finalUrl, status } of the last response.
 */
async function followRedirects(url: string, cookie: string): Promise<{ finalUrl: string; status: number }> {
    let currentUrl = url;

    for (let i = 0; i < MAX_REDIRECTS; i++) {
        const response = await fetch(currentUrl, {
            method: 'GET',
            redirect: 'manual',
            headers: {
                ...HEADERS,
                'Cookie': cookie,
            },
        });

        const status = response.status;

        // Not a redirect → we've reached the final destination
        if (status !== 301 && status !== 302 && status !== 303 && status !== 307 && status !== 308) {
            return { finalUrl: currentUrl, status };
        }

        const location = response.headers.get('location');
        if (!location) {
            return { finalUrl: currentUrl, status };
        }

        // Handle relative redirects (just in case)
        if (location.startsWith('/')) {
            const urlObj = new URL(currentUrl);
            currentUrl = `${urlObj.origin}${location}`;
        } else {
            currentUrl = location;
        }
    }

    // Too many redirects
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

    const db = await getSkins();
    const totalCodes = Object.values(db).reduce((sum: number, skins: any) => sum + (skins?.length || 0), 0);
    let hasChanges = false;
    let currentIndex = 0;

    for (const [hero, heroSkins] of Object.entries(db)) {
        const skins = (heroSkins || []) as any[];

        for (const skin of skins) {
            try {
                await delay(100);
                currentIndex++;

                const { finalUrl, status } = await followRedirects(skin.url, bnetCookie);

                // ── 3a. Cookie expired / invalid → ABORT ──
                if (finalUrl.includes('login') || finalUrl.includes('account.battle.net')) {
                    console.error('[LinkChecker] ⛔ Cookie expired or invalid! Final URL redirected to login:');
                    console.error(`   → ${finalUrl}`);
                    console.error('[LinkChecker] Aborting cycle – no changes will be saved.');
                    await sendNotification('⛔ **LinkChecker** : Cookie Battle.net expiré ou invalide !\nMets à jour `BNET_COOKIE` dans `.env` et relance le bot.');
                    return; // Exit without saving anything
                }

                // ── 3b. 404 → product gone ──
                if (status === 404) {
                    const modified = skin.is_active !== false;
                    if (modified) {
                        skin.is_active = false;
                        hasChanges = true;
                    }
                    console.log(`[LinkChecker] Code ${currentIndex}/${totalCodes} | ${skin.code} | ${skin.name} | ${modified ? `${GREEN}Json modifié${RESET}` : `${ORANGE}pas modifié${RESET}`}`);
                    continue;
                }

                let isAlive: boolean | null = null;

                // ── 3c. Checkout page reached → product exists ──
                if (finalUrl.includes('checkout')) {
                    isAlive = true;
                }
                // ── 3d. Redirected to generic shop → product is gone ──
                else if (finalUrl.includes('shop.battle.net')) {
                    isAlive = false;
                }
                // ── 3e. Unexpected → log and skip ──
                else {
                    console.log(`[LinkChecker] Code ${currentIndex}/${totalCodes} | ${skin.code} | ${skin.name} | ${ORANGE}pas modifié (URL inattendue)${RESET}`);
                    continue;
                }

                // ── 4. Update status if it changed ──
                const modified = skin.is_active !== isAlive;
                if (modified) {
                    skin.is_active = isAlive;
                    hasChanges = true;
                }

                console.log(`[LinkChecker] Code ${currentIndex}/${totalCodes} | ${skin.code} | ${skin.name} | ${modified ? `${GREEN}Json modifié${RESET}` : `${ORANGE}pas modifié${RESET}`}`);
            } catch (error) {
                console.error(`[LinkChecker] Fetch error for ${hero}/${skin.name}:`, error);
            }
        }
    }

    // ── 5. Save only if something changed ──
    if (hasChanges) {
        await saveSkins(db);
        console.log(`[LinkChecker] ✅ Cycle terminé. Json sauvegardé.`);
    } else {
        console.log(`[LinkChecker] ✅ Cycle terminé. Aucune modification.`);
    }
}

/**
 * Starts the background link checker task.
 * Runs immediately on start, then every 12 hours.
 */
export function startLinkChecker(client: Client) {
    discordClient = client;
    console.log('[LinkChecker] Background service started. Links will be verified every 12 hours.');

    // Initial run immediately after start
    runLinkCheckCycle();

    // Schedule subsequent runs
    setInterval(runLinkCheckCycle, CHECK_INTERVAL);
}
