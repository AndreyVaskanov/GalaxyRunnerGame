import type { GameSettings } from "../interface/GameData";
import type AudioManager from "./AudioManager";
import type SaveSystem from "../systems/SaveSystem";
import { DEFAULT_KEYS, bindingConflict, validBinding } from "../config/Controls";
import type { ControlBinding } from "../config/Controls";

const defaults: GameSettings = {
    musicVolume: 0.7,
    effectsVolume: 0.8,
    keys: { ...DEFAULT_KEYS }
};

function isSettings(value: unknown): value is GameSettings {
    if (!value || typeof value !== "object") return false;
    const data = value as GameSettings;
    return [data.musicVolume, data.effectsVolume].every(v => typeof v === "number" && v >= 0 && v <= 1)
        && !!data.keys && (Object.keys(DEFAULT_KEYS) as ControlBinding[]).every(key =>
            typeof data.keys[key] === "string" && (validBinding(data.keys[key]) || (key.endsWith("Alternative") && data.keys[key] === "")) && !bindingConflict(data.keys, key, data.keys[key]));
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
        const saved = this.saves.load<unknown>("settings", (_value): _value is unknown => true, null);
        const candidate = saved && typeof saved === "object" ? saved as Partial<GameSettings> : null;
        const migrated = { ...candidate, keys: { ...DEFAULT_KEYS, ...candidate?.keys } };
        for (const binding of ["attackAlternative", "pauseAlternative"] as const) {
            if (!migrated.keys[binding] && !bindingConflict(migrated.keys, binding, DEFAULT_KEYS[binding])) migrated.keys[binding] = DEFAULT_KEYS[binding];
        }
        this.settings = isSettings(migrated) ? structuredClone(migrated) : structuredClone(defaults);
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

    public assignKey(binding: ControlBinding, key: string, swap = false): { applied: boolean; saved: boolean; message: string; conflict?: boolean } {
        if (!(binding in DEFAULT_KEYS) || !validBinding(key)) {
            return { applied: false, saved: false, message: "Выберите клавишу или нажмите ЛКМ." };
        }
        if (bindingConflict(this.settings.keys, binding, key) && !swap) {
            return { applied: false, saved: false, conflict: true, message: "Клавиша занята другим действием. Поменять назначения местами?" };
        }
        const keys = { ...this.settings.keys };
        const previous = keys[binding];
        const occupied = (Object.keys(DEFAULT_KEYS) as ControlBinding[]).some(other => other !== binding && keys[other] === key);
        if (occupied) {
            for (const other of Object.keys(DEFAULT_KEYS) as ControlBinding[]) {
                if (keys[other] === key) keys[other] = previous;
                else if (keys[other] === previous) keys[other] = key;
            }
        } else keys[binding] = key;
        const next = { ...this.getSettings(), keys };
        if (!isSettings(next)) return { applied: false, saved: false, message: "Эти назначения несовместимы. Выберите другую клавишу." };
        const saved = this.update(next);
        return { applied: true, saved, message: saved ? "Назначение сохранено" : "Назначение применено, но сохранить его в браузере не удалось." };
    }
}
