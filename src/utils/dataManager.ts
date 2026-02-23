import fs from 'fs/promises';
import path from 'path';
import type { SkinDatabase } from '../types/index.js';

// Using process.cwd() ensures it always looks from the root of the project
const dataPath = path.join(process.cwd(), 'data', 'skins.json');

/**
 * Reads the skins databse from data/skins.json
 */
export async function getSkins(): Promise<SkinDatabase> {
    try {
        const fileContent = await fs.readFile(dataPath, 'utf-8');
        return JSON.parse(fileContent) as SkinDatabase;
    } catch (error) {
        console.error('Error reading skins data:', error);
        return {};
    }
}

/**
 * Saves the given object back to data/skins.json
 */
export async function saveSkins(db: SkinDatabase): Promise<void> {
    try {
        await fs.writeFile(dataPath, JSON.stringify(db, null, 4), 'utf-8');
    } catch (error) {
        console.error('Error saving skins data:', error);
    }
}
