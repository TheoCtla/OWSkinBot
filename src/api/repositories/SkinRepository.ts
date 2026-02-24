import type { Client, InArgs } from '@libsql/client';
import type { Skin, SkinWithHeroName } from '../models/index.js';

export class SkinRepository {
    private db: Client;

    constructor(db: Client) {
        this.db = db;
    }

    /** Returns all skins with hero name (JOIN), optionally filtered by heroId or heroName */
    async findAll(filters?: { heroId?: number; heroName?: string }): Promise<SkinWithHeroName[]> {
        let query = `
            SELECT skin.*, hero.name AS hero_name
            FROM skin
            JOIN hero ON skin.id_hero = hero.id
        `;
        const conditions: string[] = [];
        const args: InArgs = [];

        if (filters?.heroId) {
            conditions.push('skin.id_hero = ?');
            args.push(filters.heroId);
        }
        if (filters?.heroName) {
            conditions.push('LOWER(hero.name) = LOWER(?)');
            args.push(filters.heroName);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY hero.name, skin.name';

        const result = await this.db.execute({ sql: query, args });
        return result.rows as unknown as SkinWithHeroName[];
    }

    /** Find a skin by its unique code (with hero name) */
    async findByCode(code: string): Promise<SkinWithHeroName | undefined> {
        const result = await this.db.execute({
            sql: `
                SELECT skin.*, hero.name AS hero_name
                FROM skin
                JOIN hero ON skin.id_hero = hero.id
                WHERE skin.code = ?
            `,
            args: [code],
        });
        return result.rows[0] as unknown as SkinWithHeroName | undefined;
    }

    /** Insert a new skin */
    async create(data: { id_hero: number; name: string; code: string; price: number; is_active?: number }): Promise<Skin> {
        const isActive = data.is_active ?? 1;
        const result = await this.db.execute({
            sql: 'INSERT INTO skin (id_hero, name, code, price, is_active) VALUES (?, ?, ?, ?, ?)',
            args: [data.id_hero, data.name, data.code, data.price, isActive],
        });

        return {
            id: Number(result.lastInsertRowid),
            id_hero: data.id_hero,
            name: data.name,
            code: data.code,
            price: data.price,
            is_active: isActive,
        };
    }

    /** Partial update of a skin by code */
    async updateByCode(code: string, data: Partial<Pick<Skin, 'name' | 'price' | 'is_active'>>): Promise<boolean> {
        const fields: string[] = [];
        const args: InArgs = [];

        if (data.name !== undefined) { fields.push('name = ?'); args.push(data.name); }
        if (data.price !== undefined) { fields.push('price = ?'); args.push(data.price); }
        if (data.is_active !== undefined) { fields.push('is_active = ?'); args.push(data.is_active); }

        if (fields.length === 0) return false;

        args.push(code);
        const result = await this.db.execute({
            sql: `UPDATE skin SET ${fields.join(', ')} WHERE code = ?`,
            args,
        });
        return result.rowsAffected > 0;
    }

    /** Delete a skin by code */
    async deleteByCode(code: string): Promise<boolean> {
        const result = await this.db.execute({ sql: 'DELETE FROM skin WHERE code = ?', args: [code] });
        return result.rowsAffected > 0;
    }
}
