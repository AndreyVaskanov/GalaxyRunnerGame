export interface GameSettings {
    musicVolume: number;
    effectsVolume: number;
    keys: { left: string; right: string; jump: string; jumpAlternative: string; pause: string };
}

export interface ProgressData {
    score: number;
    crystals: number;
    unlockedEpisodes: number[];
    stars: Record<string, number>;
}

export interface CharacterData {
    selected: string;
    owned: string[];
}

export interface CharacterDefinition {
    id: string;
    price: number;
    requiredEpisode?: number;
}

export interface CheckpointData {
    id: string;
    x: number;
    y: number;
}
