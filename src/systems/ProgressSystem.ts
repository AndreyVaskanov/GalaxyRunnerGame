import type { ProgressData } from "../interface/GameData";
import type { AttemptData, EpisodeResult, RunPosition, RunSnapshot, RunTotals } from "../interface/RunData";
import type SaveSystem from "./SaveSystem";
import { hasHero } from "../characters/CharacterCatalog";
import { getEpisode } from "../levels/EpisodeCatalog";
import { checkpointId, crystalId } from "../levels/LevelObjectIds";
import { GAME_SCALE } from "../config/GameScale";
import rules from "../data/rules.json";

const defaults: ProgressData = { score: 0, crystals: 0, unlockedEpisodes: [1], stars: {} };

interface SavedProgress extends ProgressData {
    version: 1 | 2;
    collectedTotal: number;
    attempt: AttemptData | null;
    bestScores?: Record<string, number>;
}

function isProgress(value: unknown): value is ProgressData {
    if (!value || typeof value !== "object") return false;
    const data = value as ProgressData;
    return Number.isSafeInteger(data.score) && data.score >= 0
        && Number.isSafeInteger(data.crystals) && data.crystals >= 0 && data.crystals <= rules.crystal.gameLimit
        && Array.isArray(data.unlockedEpisodes) && data.unlockedEpisodes.includes(1)
        && data.unlockedEpisodes.every(id => Number.isInteger(id) && id >= 1 && id <= 4)
        && !!data.stars && typeof data.stars === "object" && !Array.isArray(data.stars)
        && Object.entries(data.stars).every(([id, count]) => /^[1-4]$/.test(id)
            && Number.isInteger(count) && count >= 0 && count <= 3);
}

function isTotals(value: RunTotals): boolean {
    return !!value && Number.isSafeInteger(value.score) && value.score >= 0
        && Number.isSafeInteger(value.crystals) && value.crystals >= 0
        && Number.isSafeInteger(value.collectedTotal) && value.collectedTotal >= value.crystals
        && value.collectedTotal <= rules.crystal.gameLimit;
}

function isPosition(position: RunPosition, episodeId: number): boolean {
    if (!position) return false;
    const episode = getEpisode(episodeId);
    return Number.isInteger(position.screenIndex) && position.screenIndex >= 0
        && position.screenIndex < episode.screens.length
        && Number.isFinite(position.x) && position.x >= 0 && position.x <= episode.screenSize[0] * GAME_SCALE
        && Number.isFinite(position.y) && position.y >= 0 && position.y <= episode.screenSize[1] * GAME_SCALE;
}

function isAttempt(value: AttemptData, current: RunTotals): boolean {
    if (!value || !Number.isInteger(value.episodeId) || value.episodeId < 1 || value.episodeId > 4
        || !hasHero(value.heroId) || !isTotals(value.start) || !isPosition(value.resume, value.episodeId)) return false;
    const episode = getEpisode(value.episodeId);
    const ids = new Set(episode.screens.flatMap((screen, index) =>
        screen.crystals.map((_, item) => crystalId(value.episodeId, index, item))));
    const validIds = (items: string[]) => Array.isArray(items) && new Set(items).size === items.length
        && items.every(id => ids.has(id));
    if (!validIds(value.collectedIds) || value.collectedIds.length > episode.crystalsTotal) return false;
    const consistent = (totals: RunTotals, count: number) => isTotals(totals)
        && totals.score === value.start.score + count * rules.crystal.points
        && totals.collectedTotal === Math.min(rules.crystal.gameLimit, value.start.collectedTotal + count)
        && totals.crystals === value.start.crystals + totals.collectedTotal - value.start.collectedTotal;
    if (!consistent(current, value.collectedIds.length)) return false;
    const cp = value.checkpoint;
    return cp === null || (!!cp && isPosition(cp.position, value.episodeId)
        && !!episode.screens[cp.position.screenIndex].checkpoint
        && cp.checkpointId === checkpointId(value.episodeId, cp.position.screenIndex)
        && validIds(cp.collectedIds) && cp.collectedIds.every(id => value.collectedIds.includes(id))
        && consistent(cp, cp.collectedIds.length));
}

function isSavedProgress(value: unknown): value is SavedProgress | ProgressData {
    if (!isProgress(value)) return false;
    const saved = value as SavedProgress;
    // Старый формат загружается без сброса заработанных очков и валюты.
    if (!("version" in value)) return true;
    return (saved.version === 1 || saved.version === 2) && isTotals(saved)
        && (saved.version === 1 || (!!saved.bestScores && typeof saved.bestScores === "object"
            && !Array.isArray(saved.bestScores) && Object.entries(saved.bestScores).every(([id, score]) =>
                /^[1-4]$/.test(id) && Number.isSafeInteger(score) && score >= 0)))
        && (saved.attempt === null || (isAttempt(saved.attempt, saved)
            && saved.unlockedEpisodes.includes(saved.attempt.episodeId)));
}

export default class ProgressSystem {
    private data: ProgressData = structuredClone(defaults);
    private collectedTotal = 0;
    private attempt: AttemptData | null = null;
    private bestScores: Record<string, number> = {};
    private readonly saves: SaveSystem;

    constructor(saves: SaveSystem) { this.saves = saves; }

    public load(): void {
        const saved = this.saves.load("progress", isSavedProgress, defaults);
        const { score, crystals, unlockedEpisodes, stars } = saved;
        this.data = { score, crystals, unlockedEpisodes, stars };
        const versioned = "version" in saved ? saved as SavedProgress : null;
        this.collectedTotal = versioned ? versioned.collectedTotal : crystals;
        this.attempt = versioned ? structuredClone(versioned.attempt) : null;
        this.bestScores = versioned?.version === 2 ? structuredClone(versioned.bestScores!) : {};
    }

    public getProgress(): ProgressData { return structuredClone(this.data); }
    public getAttempt(): AttemptData | null { return structuredClone(this.attempt); }
    public save(): boolean {
        return this.saves.save("progress", {
            ...this.data, version: 2, collectedTotal: this.collectedTotal, attempt: this.attempt, bestScores: this.bestScores
        } satisfies SavedProgress);
    }

    private getTotals(): RunTotals {
        return { score: this.data.score, crystals: this.data.crystals, collectedTotal: this.collectedTotal };
    }

    private applyTotals(totals: RunTotals): void {
        this.data.score = totals.score;
        this.data.crystals = totals.crystals;
        this.collectedTotal = totals.collectedTotal;
    }

    public beginAttempt(episodeId: number, heroId: string, position: RunPosition): void {
        if (!hasHero(heroId) || !this.data.unlockedEpisodes.includes(episodeId) || !isPosition(position, episodeId)) {
            throw new Error("Недопустимые параметры прохождения");
        }
        if (this.attempt) this.applyTotals(this.attempt.start);
        this.attempt = { episodeId, heroId, start: this.getTotals(), collectedIds: [], checkpoint: null, resume: { ...position } };
    }

    public collectCrystal(id: string): boolean {
        const attempt = this.attempt;
        if (!attempt || attempt.collectedIds.includes(id)) return false;
        const episode = getEpisode(attempt.episodeId);
        const valid = episode.screens.some((screen, index) =>
            screen.crystals.some((_, item) => crystalId(attempt.episodeId, index, item) === id));
        if (!valid || attempt.collectedIds.length >= episode.crystalsTotal
            || !Number.isSafeInteger(this.data.score + rules.crystal.points)) return false;
        attempt.collectedIds.push(id);
        this.addScore(rules.crystal.points);
        if (this.collectedTotal < rules.crystal.gameLimit) {
            this.collectedTotal++;
            this.data.crystals++;
        }
        return true;
    }

    public saveCheckpoint(id: string, position: RunPosition): boolean {
        if (!this.attempt || !isPosition(position, this.attempt.episodeId)
            || id !== checkpointId(this.attempt.episodeId, position.screenIndex)
            || !getEpisode(this.attempt.episodeId).screens[position.screenIndex].checkpoint) return false;
        this.attempt.checkpoint = {
            ...this.getTotals(), position: { ...position }, collectedIds: [...this.attempt.collectedIds], checkpointId: id
        };
        this.attempt.resume = { ...position };
        return this.save();
    }

    public restoreCheckpoint(): RunSnapshot | null {
        const cp = this.attempt?.checkpoint;
        if (!cp || !this.attempt) return null;
        this.applyTotals(cp);
        this.attempt.collectedIds = [...cp.collectedIds];
        this.attempt.resume = { ...cp.position };
        return structuredClone(cp);
    }

    public restartAttempt(position: RunPosition): void {
        if (!this.attempt) return;
        const { episodeId, heroId } = this.attempt;
        this.beginAttempt(episodeId, heroId, position);
    }

    public suspendAttempt(position: RunPosition): boolean {
        if (!this.attempt || !isPosition(position, this.attempt.episodeId)) return false;
        this.attempt.resume = { ...position };
        return this.save();
    }

    public completeAttempt(technicalFinish: boolean): EpisodeResult | null {
        const attempt = this.attempt;
        if (!attempt) return null;
        const episode = getEpisode(attempt.episodeId);
        const score = this.data.score - attempt.start.score;
        const crystals = attempt.collectedIds.length;
        const threshold = rules.starScore[String(attempt.episodeId) as keyof typeof rules.starScore];
        const stars = 1 + Number(crystals === episode.crystalsTotal) + Number(score >= threshold);
        const id = String(attempt.episodeId);
        this.data.stars[id] = Math.max(this.data.stars[id] ?? 0, stars);
        this.bestScores[id] = Math.max(this.bestScores[id] ?? 0, score);
        const nextEpisodeId = attempt.episodeId < 4 ? attempt.episodeId + 1 : null;
        if (nextEpisodeId && !this.data.unlockedEpisodes.includes(nextEpisodeId)) {
            this.data.unlockedEpisodes.push(nextEpisodeId);
        }
        // Начисленное закрепляется: следующая попытка уже не откатывает завершённую.
        this.attempt = null;
        const saved = this.save();
        return { episodeId: attempt.episodeId, score, crystals, crystalCount: episode.crystalsTotal,
            stars, bestScore: this.bestScores[id], nextEpisodeId, technicalFinish, saved };
    }

    public addScore(amount: number): void {
        if (Number.isSafeInteger(amount) && amount >= 0 && Number.isSafeInteger(this.data.score + amount)) {
            this.data.score += amount;
        }
    }

    public spendCrystals(amount: number): boolean {
        // Покупки во время попытки потребуют согласования с её снимками.
        if (this.attempt || !Number.isSafeInteger(amount) || amount < 0 || amount > this.data.crystals) return false;
        this.data.crystals -= amount;
        return true;
    }
}
