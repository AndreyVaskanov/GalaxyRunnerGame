// Исходный формат материалов: координаты 1280 × 720.
// При построении в 1920 × 1080 координаты и размеры умножаются на 1.5.
export interface EnemySpawn {
    type: string;
    x: number;
    y: number;
    facing: "left" | "right";
}

export interface LevelScreenConfig {
    platforms: { x: number; y: number; w: number }[];
    obstacles: { type: string; x: number; y: number; w: number; h: number; toggleSec?: number }[];
    crystals: { x: number; y: number }[];
    enemies: EnemySpawn[];
    checkpoint: { x: number } | null;
    bossSpawn?: { x: number; y: number };
}

export interface EpisodeConfig {
    episode: number;
    name: string;
    biome: string;
    hero: string;
    heroOnly?: string;
    boss: string;
    screens: LevelScreenConfig[];
    screenSize: [number, number];
    groundY: number;
    background: string;
    crystalsTotal: number;
    note?: string;
}
