import { HeroRepository } from '../repositories/HeroRepository.js';
import type { Hero } from '../models/index.js';

export class HeroService {
    private heroRepo: HeroRepository;

    constructor(heroRepo: HeroRepository) {
        this.heroRepo = heroRepo;
    }

    async getAllHeroes(): Promise<Hero[]> {
        return this.heroRepo.findAll();
    }

    async getHeroById(id: number): Promise<Hero | undefined> {
        return this.heroRepo.findById(id);
    }

    async getHeroByName(name: string): Promise<Hero | undefined> {
        return this.heroRepo.findByName(name);
    }

    async createHero(name: string): Promise<Hero> {
        return this.heroRepo.create(name);
    }

    async deleteHero(id: number): Promise<boolean> {
        return this.heroRepo.deleteById(id);
    }
}
