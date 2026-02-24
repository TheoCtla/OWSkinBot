// ── Hero model ──
export interface Hero {
    id: number;
    name: string;
}

// ── Skin model ──
export interface Skin {
    id: number;
    id_hero: number;
    name: string;
    price: number;
    code: string;
    is_active: number; // 0 or 1 (SQLite boolean)
}

// ── DTO: Skin with hero name for API responses ──
export interface SkinWithHeroName {
    id: number;
    id_hero: number;
    hero_name: string;
    name: string;
    price: number;
    code: string;
    is_active: number;
}
