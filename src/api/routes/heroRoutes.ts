import { Router } from 'express';
import { HeroController } from '../controllers/HeroController.js';

export function createHeroRoutes(controller: HeroController): Router {
    const router = Router();

    router.get('/', (req, res) => controller.getAll(req, res));
    router.post('/', (req, res) => controller.create(req, res));
    router.delete('/:id', (req, res) => controller.delete(req, res));

    return router;
}
