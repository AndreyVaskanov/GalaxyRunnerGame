import type { GameSettings } from "../interface/GameData";
import type AudioManager from "./AudioManager";
import type SaveSystem from "../systems/SaveSystem";

const defaults: GameSettings = {
    musicVolume: 0.7,
    effectsVolume: 0.8,
    keys: { left: "A", right: "D", jump: "SPACE", jumpAlternative: "W", pause: "ESC" }
};

function isSettings(value: unknown): value is GameSettings {
    if (!value || typeof value !== "object") return false;
    const data = value as GameSettings;
    return [data.musicVolume, data.effectsVolume].every(v => typeof v === "number" && v >= 0 && v <= 1)
        && !!data.keys && Object.keys(defaults.keys).every(key =>
            typeof data.keys[key as keyof GameSettings["keys"]] === "string"
            && data.keys[key as keyof GameSettings["keys"]].length > 0);
}

export default class SettingsManager {
    private settings: GameSettings = structuredClone(defaults);
    private readonly saves: SaveSystem;
    private readonly audio: AudioManager;

    constructor(saves: SaveSystem, audio: AudioManager) {
        this.saves = saves;
        this.audio = audio;
    }

    public load(): void {
        this.settings = this.saves.load("settings", isSettings, defaults);
        this.audio.applySettings(this.settings);
    }

    public getSettings(): GameSettings { return structuredClone(this.settings); }

    public update(settings: GameSettings): boolean {
        if (!isSettings(settings)) return false;
        this.settings = structuredClone(settings);
        this.audio.applySettings(this.settings);
        return this.saves.save("settings", this.settings);
    }

    public reset(): boolean { return this.update(defaults); }
}
