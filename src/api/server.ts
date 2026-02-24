import 'dotenv/config';
import express from 'express';
import db from './config/db.js';

// Repositories
import { HeroRepository } from './repositories/HeroRepository.js';
import { SkinRepository } from './repositories/SkinRepository.js';

// Services
import { HeroService } from './services/HeroService.js';
import { SkinService } from './services/SkinService.js';

// Controllers
import { HeroController } from './controllers/HeroController.js';
import { SkinController } from './controllers/SkinController.js';

// Routes
import { createHeroRoutes } from './routes/heroRoutes.js';
import { createSkinRoutes } from './routes/skinRoutes.js';

// ── Dependency Injection ──
const heroRepo = new HeroRepository(db);
const skinRepo = new SkinRepository(db);

const heroService = new HeroService(heroRepo);
const skinService = new SkinService(skinRepo);

const heroController = new HeroController(heroService);
const skinController = new SkinController(skinService);

// ── Express App ──
const app = express();
app.use(express.json());

// ── Routes ──
app.get('/', (_req, res) => res.send('OW Skin Bot API is alive!'));
app.use('/api/heroes', createHeroRoutes(heroController));
app.use('/api/skins', createSkinRoutes(skinController));

// ── Start ──
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`🚀 API REST démarrée sur http://localhost:${port}`);
    console.log(`   → GET  /api/heroes`);
    console.log(`   → GET  /api/skins`);
    console.log(`   → GET  /api/skins/:code`);
    console.log(`   → POST /api/skins`);
    console.log(`   → PATCH /api/skins/:code`);
    console.log(`   → DELETE /api/skins/:code`);
});

export default app;
