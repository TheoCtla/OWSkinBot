import type { Request, Response } from 'express';
import { HeroService } from '../services/HeroService.js';

export class HeroController {
    private heroService: HeroService;

    constructor(heroService: HeroService) {
        this.heroService = heroService;
    }

    /** GET /api/heroes */
    async getAll(_req: Request, res: Response): Promise<void> {
        try {
            const heroes = await this.heroService.getAllHeroes();
            res.json(heroes);
        } catch (error) {
            console.error('[HeroController] getAll error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /** POST /api/heroes */
    async create(req: Request, res: Response): Promise<void> {
        try {
            const { name } = req.body;

            if (!name) {
                res.status(400).json({ error: 'Missing required field: name' });
                return;
            }

            const hero = await this.heroService.createHero(name);
            res.status(201).json(hero);
        } catch (error: any) {
            if (error?.message?.includes('UNIQUE')) {
                res.status(400).json({ error: `Hero '${req.body.name}' already exists` });
                return;
            }
            console.error('[HeroController] create error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /** DELETE /api/heroes/:id */
    async delete(req: Request, res: Response): Promise<void> {
        try {
            const id = Number(req.params.id);
            const deleted = await this.heroService.deleteHero(id);
            if (!deleted) {
                res.status(404).json({ error: `Hero with id '${id}' not found` });
                return;
            }
            res.json({ message: `Hero '${id}' deleted successfully` });
        } catch (error) {
            console.error('[HeroController] delete error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
