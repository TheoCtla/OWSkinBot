import { Router } from 'express';
import { SkinController } from '../controllers/SkinController.js';
import { requireApiKey } from '../middlewares/auth.js';

export function createSkinRoutes(controller: SkinController): Router {
    const router = Router();

    // Public
    router.get('/', (req, res) => controller.getAll(req, res));
    router.get('/:code', (req, res) => controller.getByCode(req, res));

    // Protected
    router.post('/', requireApiKey, (req, res) => controller.create(req, res));
    router.patch('/:code', requireApiKey, (req, res) => controller.update(req, res));
    router.delete('/:code', requireApiKey, (req, res) => controller.delete(req, res));

    return router;
}
