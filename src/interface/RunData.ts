// Координаты позиции — в рабочих пикселях. Здесь нет объектов Phaser.
export interface RunPosition {
    screenIndex: number;
    x: number;
    y: number;
}

export interface RunTotals {
    score: number;
    crystals: number;
    collectedTotal: number;
}

export interface RunSnapshot extends RunTotals {
    position: RunPosition;
    collectedIds: string[];
    checkpointId: string;
    health?: number;
    defeatedIds?: string[];
    enemies?: EnemySnapshot[];
    boss?: BossSnapshot | null;
}

export interface BossSnapshot {
    type: string;
    hp: number;
    x: number;
    y: number;
}

export interface EnemySnapshot {
    id: string;
    hp: number;
    x: number;
    y: number;
    facing: "left" | "right";
}

export interface AttemptData {
    episodeId: number;
    heroId: string;
    start: RunTotals;
    collectedIds: string[];
    checkpoint: RunSnapshot | null;
    resume: RunPosition;
    health?: number;
    defeatedIds?: string[];
    enemies?: EnemySnapshot[];
    damaged?: boolean;
    boss?: BossSnapshot | null;
}

export type LevelEvent =
    | { type: "hazardHit"; damage: number }
    | { type: "crystal"; id: string }
    | { type: "checkpoint"; id: string; position: RunPosition };

export interface EpisodeResult {
    episodeId: number;
    score: number;
    crystals: number;
    crystalCount: number;
    stars: number;
    bestScore: number;
    nextEpisodeId: number | null;
    saved: boolean;
}

export interface HudData {
    health: number;
    score: number;
    totalScore: number;
    crystals: number;
    episodeId: number;
    screenIndex: number;
    message: string;
}
