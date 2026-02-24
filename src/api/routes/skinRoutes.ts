import { Router } from 'express';
import { SkinController } from '../controllers/SkinController.js';

export function createSkinRoutes(controller: SkinController): Router {
    const router = Router();

    router.get('/', (req, res) => controller.getAll(req, res));
    router.get('/:code', (req, res) => controller.getByCode(req, res));
    router.post('/', (req, res) => controller.create(req, res));
    router.patch('/:code', (req, res) => controller.update(req, res));
    router.delete('/:code', (req, res) => controller.delete(req, res));

    return router;
}
