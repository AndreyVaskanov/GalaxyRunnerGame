export interface GameSettings {
    musicVolume: number;
    effectsVolume: number;
    keys: { left: string; leftAlternative: string; right: string; rightAlternative: string;
        jump: string; jumpAlternative: string; attack: string; attackAlternative: string; pause: string; pauseAlternative: string };
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
