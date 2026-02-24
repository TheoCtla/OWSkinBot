import { Router } from 'express';
import { HeroController } from '../controllers/HeroController.js';
import { requireApiKey } from '../middlewares/auth.js';

export function createHeroRoutes(controller: HeroController): Router {
    const router = Router();

    // Public
    router.get('/', (req, res) => controller.getAll(req, res));

    // Protected
    router.post('/', requireApiKey, (req, res) => controller.create(req, res));
    router.delete('/:id', requireApiKey, (req, res) => controller.delete(req, res));

    return router;
}
