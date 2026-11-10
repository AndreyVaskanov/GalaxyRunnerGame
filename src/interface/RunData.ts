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
}

export interface AttemptData {
    episodeId: number;
    heroId: string;
    start: RunTotals;
    collectedIds: string[];
    checkpoint: RunSnapshot | null;
    resume: RunPosition;
}

export type LevelEvent =
    | { type: "crystal"; id: string }
    | { type: "checkpoint"; id: string; position: RunPosition }
    | { type: "technicalFinish" };

export interface EpisodeResult {
    episodeId: number;
    score: number;
    crystals: number;
    crystalCount: number;
    stars: number;
    bestScore: number;
    nextEpisodeId: number | null;
    technicalFinish: boolean;
    saved: boolean;
}

export interface HudData {
    health: number;
    score: number;
    crystals: number;
    episodeId: number;
    screenIndex: number;
    message: string;
}
