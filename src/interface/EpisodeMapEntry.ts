export interface EpisodeMapEntry {
    id: number;
    name: string;
    location: string;
    bossName: string;
    stars: number;
    unlocked: boolean;
    heroAllowed: boolean;
    requiredHeroName: string | null;
    canContinue: boolean;
    crystalCount: number;
    starScore: number;
}
