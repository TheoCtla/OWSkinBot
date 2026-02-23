export interface Skin {
    code: string;
    name: string;
    url: string;
    is_active: boolean;
}

export type SkinDatabase = Record<string, Skin[]>;
