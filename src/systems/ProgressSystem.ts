import type { ProgressData } from "../interface/GameData";
import type SaveSystem from "./SaveSystem";

const defaults: ProgressData = { score: 0, crystals: 0, unlockedEpisodes: [1], stars: {} };

function isProgress(value: unknown): value is ProgressData {
    if (!value || typeof value !== "object") return false;
    const data = value as ProgressData;
    return Number.isSafeInteger(data.score) && data.score >= 0
        && Number.isSafeInteger(data.crystals) && data.crystals >= 0 && data.crystals <= 100
        && Array.isArray(data.unlockedEpisodes) && data.unlockedEpisodes.includes(1)
        && data.unlockedEpisodes.every(id => Number.isInteger(id) && id >= 1 && id <= 4)
        && !!data.stars && typeof data.stars === "object" && !Array.isArray(data.stars)
        && Object.entries(data.stars).every(([id, count]) => /^[1-4]$/.test(id)
            && Number.isInteger(count) && count >= 0 && count <= 3);
}

export default class ProgressSystem {
    private data: ProgressData = structuredClone(defaults);
    private readonly saves: SaveSystem;

    constructor(saves: SaveSystem) { this.saves = saves; }

    public load(): void { this.data = this.saves.load("progress", isProgress, defaults); }
    public getProgress(): ProgressData { return structuredClone(this.data); }
    public save(): boolean { return this.saves.save("progress", this.data); }

    public addScore(amount: number): void {
        if (Number.isSafeInteger(amount) && amount >= 0 && Number.isSafeInteger(this.data.score + amount)) {
            this.data.score += amount;
        }
    }

    public spendCrystals(amount: number): boolean {
        if (!Number.isSafeInteger(amount) || amount < 0 || amount > this.data.crystals) return false;
        this.data.crystals -= amount;
        return true;
    }

    // Награды и расчёт звёзд добавляются при реализации игровых событий.
}
