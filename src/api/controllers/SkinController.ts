import type { Request, Response } from 'express';
import { SkinService } from '../services/SkinService.js';

export class SkinController {
    private skinService: SkinService;

    constructor(skinService: SkinService) {
        this.skinService = skinService;
    }

    /** GET /api/skins — with optional ?heroId= or ?heroName= filters */
    async getAll(req: Request, res: Response): Promise<void> {
        try {
            const heroId = req.query.heroId ? Number(req.query.heroId) : undefined;
            const heroName = req.query.heroName ? String(req.query.heroName) : undefined;

            const skins = await this.skinService.getAllSkins({ heroId, heroName });
            res.json(skins);
        } catch (error) {
            console.error('[SkinController] getAll error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /** GET /api/skins/:code */
    async getByCode(req: Request, res: Response): Promise<void> {
        try {
            const code = String(req.params.code);
            const skin = await this.skinService.getSkinByCode(code);
            if (!skin) {
                res.status(404).json({ error: `Skin with code '${code}' not found` });
                return;
            }
            res.json(skin);
        } catch (error) {
            console.error('[SkinController] getByCode error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /** POST /api/skins */
    async create(req: Request, res: Response): Promise<void> {
        try {
            const { id_hero, name, code, price } = req.body;

            if (!id_hero || !name || !code || price === undefined) {
                res.status(400).json({ error: 'Missing required fields: id_hero, name, code, price' });
                return;
            }

            const skin = await this.skinService.createSkin({ id_hero, name, code, price });
            res.status(201).json(skin);
        } catch (error: any) {
            // Turso / LibSQL utilise "SQLITE_CONSTRAINT" comme code d'erreur pour les contraintes uniques
            if (error?.code === 'SQLITE_CONSTRAINT' || error?.message?.includes('UNIQUE')) {
                res.status(400).json({ error: `Skin with code '${req.body.code}' already exists` });
                return;
            }
            console.error('[SkinController] create error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /** PATCH /api/skins/:code */
    async update(req: Request, res: Response): Promise<void> {
        try {
            const code = String(req.params.code);
            const { name, price, is_active } = req.body;

            const updated = await this.skinService.updateSkin(code, { name, price, is_active });
            if (!updated) {
                res.status(404).json({ error: `Skin with code '${code}' not found` });
                return;
            }

            const skin = await this.skinService.getSkinByCode(code);
            res.json(skin);
        } catch (error) {
            console.error('[SkinController] update error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /** DELETE /api/skins/:code */
    async delete(req: Request, res: Response): Promise<void> {
        try {
            const code = String(req.params.code);
            const deleted = await this.skinService.deleteSkin(code);
            if (!deleted) {
                res.status(404).json({ error: `Skin with code '${code}' not found` });
                return;
            }
            res.json({ message: `Skin '${code}' deleted successfully` });
        } catch (error) {
            console.error('[SkinController] delete error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
