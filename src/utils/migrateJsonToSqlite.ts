import 'dotenv/config';
import { createClient } from '@libsql/client';
import type { InStatement } from '@libsql/client';
import fs from 'fs';
import path from 'path';

const JSON_PATH = path.join(process.cwd(), 'datas', 'skins.json');

// ── 1. Connect to Turso ──
const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
    // ── 2. Read JSON ──
    console.log(`📖 Lecture du fichier JSON : ${JSON_PATH}`);
    const raw = fs.readFileSync(JSON_PATH, 'utf-8');
    const data: Record<string, { name: string; code: string; is_active: boolean }[]> = JSON.parse(raw);

    // ── 3. Drop & create tables ──
    console.log('🗃️  Création des tables sur Turso...');
    await db.batch([
        'DROP TABLE IF EXISTS skin',
        'DROP TABLE IF EXISTS hero',
        `CREATE TABLE hero (
            id   INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        )`,
        `CREATE TABLE skin (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            id_hero   INTEGER NOT NULL,
            name      TEXT NOT NULL,
            price     INTEGER DEFAULT 0,
            code      TEXT UNIQUE NOT NULL,
            is_active INTEGER DEFAULT 1,
            FOREIGN KEY(id_hero) REFERENCES hero(id)
        )`,
    ]);
    console.log('Tables hero et skin créées.');

    // ── 4. Insert heroes in alphabetical order ──
    const heroNames = Object.keys(data).sort((a, b) => a.localeCompare(b));
    const heroStatements: InStatement[] = heroNames.map(name => ({
        sql: 'INSERT INTO hero (name) VALUES (?)',
        args: [name],
    }));

    console.log(`📝 Insertion de ${heroNames.length} héros...`);
    await db.batch(heroStatements);

    // ── 5. Fetch hero IDs ──
    const heroResult = await db.execute('SELECT id, name FROM hero');
    const heroMap = new Map<string, number>();
    for (const row of heroResult.rows) {
        heroMap.set(row.name as string, row.id as number);
    }

    // ── 6. Insert skins in batches (Turso has a batch size limit) ──
    const BATCH_SIZE = 100;
    const skinStatements: InStatement[] = [];

    for (const [heroName, skins] of Object.entries(data)) {
        const heroId = heroMap.get(heroName);
        if (!heroId) continue;

        for (const skin of skins) {
            skinStatements.push({
                sql: 'INSERT OR IGNORE INTO skin (id_hero, name, code, price, is_active) VALUES (?, ?, ?, 0, ?)',
                args: [heroId, skin.name, skin.code, skin.is_active ? 1 : 0],
            });
        }
    }

    console.log(`📝 Insertion de ${skinStatements.length} skins par lots de ${BATCH_SIZE}...`);

    for (let i = 0; i < skinStatements.length; i += BATCH_SIZE) {
        const batch = skinStatements.slice(i, i + BATCH_SIZE);
        await db.batch(batch);
        console.log(`   → Lot ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(skinStatements.length / BATCH_SIZE)} inséré`);
    }

    console.log(`🎉 Migration terminée ! ${heroNames.length} héros et ${skinStatements.length} skins insérés sur Turso.`);
}

migrate().catch(console.error);
