import fs from 'fs/promises';
import path from 'path';

interface SkinEntry {
    code: string;
    name: string;
    url: string;
    is_active: boolean;
}

type SkinDatabase = Record<string, SkinEntry[]>;

// Known hero names that contain special characters (colon, period)
// so we don't accidentally split on the wrong " - "
const KNOWN_HEROES = [
    'soldier: 76',
    'd.va',
    'wrecking ball',
    'junker queen',
];

/**
 * Splits "Hero - Skin Name" into [hero, skinName].
 * Handles heroes with special characters like "Soldier: 76" or "D.Va".
 */
function extractHeroAndSkin(rawName: string): { hero: string; skinName: string } {
    const nameLower = rawName.toLowerCase();

    // Check known heroes first (ones that contain special chars)
    for (const knownHero of KNOWN_HEROES) {
        if (nameLower.startsWith(knownHero + ' - ')) {
            return {
                hero: rawName.substring(0, knownHero.length).toLowerCase(),
                skinName: rawName.substring(knownHero.length + 3).trim(), // skip " - "
            };
        }
    }

    // Standard split on the FIRST " - "
    const dashIndex = rawName.indexOf(' - ');
    if (dashIndex !== -1) {
        return {
            hero: rawName.substring(0, dashIndex).trim().toLowerCase(),
            skinName: rawName.substring(dashIndex + 3).trim(),
        };
    }

    // No dash found → unknown hero
    return { hero: 'unknown', skinName: rawName.trim() };
}

async function main() {
    const inputPath = path.join(process.cwd(), 'data', 'database.txt');
    const outputPath = path.join(process.cwd(), 'data', 'skins.json');

    console.log(`[Convert] Reading ${inputPath}...`);
    const raw = await fs.readFile(inputPath, 'utf-8');

    // ── 1. Join wrapped lines ──
    // The file has lines that wrap: a data line starts with a code (digits),
    // and continuation lines do NOT start with digits. We merge them.
    const rawLines = raw.split('\n');
    const joinedLines: string[] = [];

    for (const line of rawLines) {
        // Strip form-feed characters
        const cleaned = line.replace(/\f/g, '').trimEnd();

        // If this line starts with digits, it's a new entry
        if (/^\d+\s*\|/.test(cleaned)) {
            joinedLines.push(cleaned);
        } else if (joinedLines.length > 0 && cleaned.length > 0) {
            // Continuation of previous line
            joinedLines[joinedLines.length - 1] += ' ' + cleaned;
        }
    }

    // ── 2. Parse each joined line ──
    const db: SkinDatabase = {};
    let parsedCount = 0;
    let skippedCount = 0;

    for (const line of joinedLines) {
        // Skip headers and non-data lines
        if (line.startsWith('---') || line.includes('The format is:')) {
            skippedCount++;
            continue;
        }

        // Must contain at least one pipe
        if (!line.includes('|')) {
            skippedCount++;
            continue;
        }

        const parts = line.split('|');
        if (parts.length < 2) {
            skippedCount++;
            continue;
        }

        // Extract code (first part, digits only)
        const code = parts[0].trim();
        if (!/^\d+$/.test(code)) {
            skippedCount++;
            continue;
        }

        // Extract name (second part)
        let rawName = parts[1].trim();

        // Remove "Nam = " or "Nam= " prefix
        rawName = rawName.replace(/^Nam\s*=\s*/, '');

        if (!rawName) {
            skippedCount++;
            continue;
        }

        // ── 3. Deduce hero and skin name ──
        const { hero, skinName } = extractHeroAndSkin(rawName);

        // ── 4. Build URL and entry ──
        const url = `https://eu.battle.net/shop/en/checkout/buy/${code}`;

        const entry: SkinEntry = {
            code,
            name: skinName,
            url,
            is_active: false,
        };

        if (!db[hero]) {
            db[hero] = [];
        }
        db[hero].push(entry);
        parsedCount++;
    }

    // ── 5. Save ──
    await fs.writeFile(outputPath, JSON.stringify(db, null, 4), 'utf-8');

    // ── 6. Summary ──
    const heroes = Object.keys(db).sort();
    console.log(`\n[Convert]  Done!`);
    console.log(`  Parsed: ${parsedCount} entries`);
    console.log(`  Skipped: ${skippedCount} lines`);
    console.log(`  Heroes: ${heroes.length}`);
    console.log(`\n  Breakdown:`);
    for (const hero of heroes) {
        console.log(`    ${hero}: ${db[hero].length} skins`);
    }
    console.log(`\n  Output: ${outputPath}`);
}

main().catch(console.error);
