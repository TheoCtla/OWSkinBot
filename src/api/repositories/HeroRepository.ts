import type { Client } from '@libsql/client';
import type { Hero } from '../models/index.js';

export class HeroRepository {
    private db: Client;

    constructor(db: Client) {
        this.db = db;
    }

    /** Returns all heroes */
    async findAll(): Promise<Hero[]> {
        const result = await this.db.execute('SELECT * FROM hero ORDER BY name');
        return result.rows as unknown as Hero[];
    }

    /** Find a hero by id */
    async findById(id: number): Promise<Hero | undefined> {
        const result = await this.db.execute({ sql: 'SELECT * FROM hero WHERE id = ?', args: [id] });
        return result.rows[0] as unknown as Hero | undefined;
    }

    /** Find a hero by name (case-insensitive) */
    async findByName(name: string): Promise<Hero | undefined> {
        const result = await this.db.execute({ sql: 'SELECT * FROM hero WHERE LOWER(name) = LOWER(?)', args: [name] });
        return result.rows[0] as unknown as Hero | undefined;
    }

    /** Insert a new hero, returns the created hero */
    async create(name: string): Promise<Hero> {
        const result = await this.db.execute({ sql: 'INSERT INTO hero (name) VALUES (?)', args: [name] });
        return { id: Number(result.lastInsertRowid), name };
    }

    /** Delete a hero by id */
    async deleteById(id: number): Promise<boolean> {
        const result = await this.db.execute({ sql: 'DELETE FROM hero WHERE id = ?', args: [id] });
        return result.rowsAffected > 0;
    }
}
