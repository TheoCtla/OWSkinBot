import { SkinRepository } from '../repositories/SkinRepository.js';
import type { Skin, SkinWithHeroName } from '../models/index.js';

export class SkinService {
    private skinRepo: SkinRepository;

    constructor(skinRepo: SkinRepository) {
        this.skinRepo = skinRepo;
    }

    async getAllSkins(filters?: { heroId?: number; heroName?: string }): Promise<SkinWithHeroName[]> {
        return this.skinRepo.findAll(filters);
    }

    async getSkinByCode(code: string): Promise<SkinWithHeroName | undefined> {
        return this.skinRepo.findByCode(code);
    }

    async createSkin(data: { id_hero: number; name: string; code: string; price: number; is_active?: number }): Promise<Skin> {
        return this.skinRepo.create(data);
    }

    async updateSkin(code: string, data: Partial<Pick<Skin, 'name' | 'price' | 'is_active'>>): Promise<boolean> {
        return this.skinRepo.updateByCode(code, data);
    }

    async deleteSkin(code: string): Promise<boolean> {
        return this.skinRepo.deleteByCode(code);
    }
}
