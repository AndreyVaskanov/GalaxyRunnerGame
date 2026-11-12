import type { ProgressData } from "../interface/GameData";
import type { AttemptData, BossSnapshot, EnemySnapshot, EpisodeResult, RunPosition, RunSnapshot, RunTotals } from "../interface/RunData";
import type SaveSystem from "./SaveSystem";
import { hasHero } from "../characters/CharacterCatalog";
import { getEpisode } from "../levels/EpisodeCatalog";
import { checkpointId, crystalId } from "../levels/LevelObjectIds";
import { GAME_SCALE } from "../config/GameScale";
import rules from "../data/rules.json";
import bosses from "../data/bosses.json";
import { getEnemy, getEnemySpawns } from "../enemies/EnemyCatalog";

const defaults: ProgressData = { score: 0, crystals: 0, unlockedEpisodes: [1], stars: {} };

interface SavedProgress extends ProgressData {
    version: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
    collectedTotal: number;
    attempt: AttemptData | null;
    bestScores?: Record<string, number>;
    spentTotal?: number;
    completedScore?: number;
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
        && value.crystals <= rules.crystal.gameLimit;
}

function isPosition(position: RunPosition, episodeId: number): boolean {
    if (!position) return false;
    const episode = getEpisode(episodeId);
    return Number.isInteger(position.screenIndex) && position.screenIndex >= 0
        && position.screenIndex < episode.screens.length
        && Number.isFinite(position.x) && position.x >= 0 && position.x <= episode.screenSize[0] * GAME_SCALE
        && Number.isFinite(position.y) && position.y >= 0 && position.y <= episode.screenSize[1] * GAME_SCALE;
}

function isAttempt(value: AttemptData, current: RunTotals, version = 1): boolean {
    if (!value || !Number.isInteger(value.episodeId) || value.episodeId < 1 || value.episodeId > 4
        || !hasHero(value.heroId) || !isTotals(value.start) || !isPosition(value.resume, value.episodeId)) return false;
    const validHealth = (health: number | undefined) => (version < 8 && health === undefined)
        || (Number.isFinite(health) && health! > 0 && health! <= rules.lives && Number.isInteger(health! * 2));
    if (!validHealth(value.health)) return false;
    const episode = getEpisode(value.episodeId);
    const validBoss = (boss: BossSnapshot | null | undefined) => boss === null || (version < 7 && boss === undefined)
        || (!!boss && boss.type === episode.boss && Number.isInteger(boss.hp) && boss.hp > 0 && boss.hp <= 100
            && Number.isFinite(boss.x) && boss.x >= 0 && boss.x <= episode.screenSize[0] * GAME_SCALE
            && Number.isFinite(boss.y) && boss.y >= 0 && boss.y <= episode.screenSize[1] * GAME_SCALE);
    if (!validBoss(value.boss)) return false;
    const ids = new Set(episode.screens.flatMap((screen, index) =>
        screen.crystals.map((_, item) => crystalId(value.episodeId, index, item))));
    const validIds = (items: string[]) => Array.isArray(items) && new Set(items).size === items.length
        && items.every(id => ids.has(id));
    const spawns = getEnemySpawns(episode);
    const validDefeated = (items: string[]) => Array.isArray(items) && new Set(items).size === items.length
        && items.every(id => spawns.has(id));
    const validEnemies = (items: EnemySnapshot[], defeated: string[]) => Array.isArray(items)
        && new Set(items.map(item => item?.id)).size === items.length && items.every(item => {
            const spawn = item && spawns.get(item.id);
            return !!spawn && !defeated.includes(item.id) && Number.isInteger(item.hp) && item.hp > 0
                && item.hp <= getEnemy(spawn.type).hp && (item.facing === "left" || item.facing === "right")
                && Number.isFinite(item.x) && item.x >= 0 && item.x <= episode.screenSize[0] * GAME_SCALE
                && Number.isFinite(item.y) && item.y >= 0 && item.y <= episode.screenSize[1] * GAME_SCALE;
        });
    if (version >= 5 && (!validDefeated(value.defeatedIds!) || !validEnemies(value.enemies!, value.defeatedIds!)
        || typeof value.damaged !== "boolean")) return false;
    if (!validIds(value.collectedIds) || value.collectedIds.length > episode.crystalsTotal) return false;
    const consistent = (totals: RunTotals, count: number, defeated: string[] = []) => isTotals(totals)
        && totals.score === value.start.score + count * rules.crystal.points
            + defeated.reduce((sum, id) => sum + getEnemy(spawns.get(id)!.type).points, 0)
        && (version >= 3
            ? totals.collectedTotal >= value.start.collectedTotal
            : totals.collectedTotal === Math.min(rules.crystal.gameLimit, value.start.collectedTotal + count)
                && totals.crystals === value.start.crystals + totals.collectedTotal - value.start.collectedTotal);
    if (version >= 3 && value.start.score !== 0) return false;
    if (!consistent(current, value.collectedIds.length, version >= 5 ? value.defeatedIds : [])) return false;
    const cp = value.checkpoint;
    return cp === null || (!!cp && isPosition(cp.position, value.episodeId)
        && !!episode.screens[cp.position.screenIndex].checkpoint
        && cp.checkpointId === checkpointId(value.episodeId, cp.position.screenIndex)
        && validIds(cp.collectedIds) && cp.collectedIds.every(id => value.collectedIds.includes(id))
        && (version < 5 || (validDefeated(cp.defeatedIds!) && validEnemies(cp.enemies!, cp.defeatedIds!)
            && cp.defeatedIds!.every(id => value.defeatedIds!.includes(id))))
        && validBoss(cp.boss) && validHealth(cp.health)
        && consistent(cp, cp.collectedIds.length, version >= 5 ? cp.defeatedIds : []));
}

function isSavedProgress(value: unknown): value is SavedProgress | ProgressData {
    if (!isProgress(value)) return false;
    const saved = value as SavedProgress;
    // Старый формат загружается без сброса заработанных очков и валюты.
    if (!("version" in value)) return true;
    return (saved.version === 1 || saved.version === 2 || saved.version === 3 || saved.version === 4 || saved.version === 5 || saved.version === 6 || saved.version === 7 || saved.version === 8) && isTotals(saved)
        && (saved.version === 1 || (!!saved.bestScores && typeof saved.bestScores === "object"
            && !Array.isArray(saved.bestScores) && Object.entries(saved.bestScores).every(([id, score]) =>
                /^[1-4]$/.test(id) && Number.isSafeInteger(score) && score >= 0)))
        && (saved.version < 3 || (Number.isSafeInteger(saved.spentTotal) && saved.spentTotal! >= 0
            && saved.spentTotal! <= saved.collectedTotal && saved.crystals === saved.collectedTotal - saved.spentTotal!))
        && (saved.version < 4 || (Number.isSafeInteger(saved.completedScore) && saved.completedScore! >= 0
            && Number.isSafeInteger(saved.completedScore! + (saved.attempt ? saved.score : 0))))
        && (saved.attempt === null || (isAttempt(saved.attempt, saved, saved.version)
            && saved.unlockedEpisodes.includes(saved.attempt.episodeId)));
}

export default class ProgressSystem {
    private data: ProgressData = structuredClone(defaults);
    private collectedTotal = 0;
    private spentTotal = 0;
    private attempt: AttemptData | null = null;
    private bestScores: Record<string, number> = {};
    private completedScore = 0;
    private readonly saves: SaveSystem;

    constructor(saves: SaveSystem) { this.saves = saves; }

    public load(): void {
        const saved = this.saves.loadProfileData("progress", isSavedProgress, defaults);
        const { score, crystals, unlockedEpisodes, stars } = saved;
        this.data = { score, crystals, unlockedEpisodes, stars };
        const versioned = "version" in saved ? saved as SavedProgress : null;
        this.collectedTotal = versioned ? versioned.collectedTotal : crystals;
        this.spentTotal = versioned && versioned.version >= 3 ? versioned.spentTotal! : this.collectedTotal - crystals;
        this.attempt = versioned ? structuredClone(versioned.attempt) : null;
        if (this.attempt) {
            this.attempt.defeatedIds ??= [];
            this.attempt.enemies ??= [];
            this.attempt.damaged ??= false;
            this.attempt.boss ??= null;
            this.attempt.health ??= rules.lives;
            if (this.attempt.checkpoint) {
                this.attempt.checkpoint.defeatedIds ??= [];
                this.attempt.checkpoint.enemies ??= [];
                this.attempt.checkpoint.boss ??= null;
                this.attempt.checkpoint.health ??= rules.lives;
            }
        }
        this.bestScores = versioned && versioned.version >= 2 ? structuredClone(versioned.bestScores!) : {};
        let updatedStars = false;
        for (const [id, threshold] of Object.entries(rules.starScore)) {
            if (this.data.stars[id] === 2 && (this.bestScores[id] ?? 0) >= threshold) {
                this.data.stars[id] = 3;
                updatedStars = true;
            }
        }
        this.completedScore = versioned && versioned.version >= 4 ? versioned.completedScore!
            : versioned?.version === 3 ? Object.values(this.bestScores).reduce((sum, value) => sum + value, 0)
            : Math.max(0, saved.score - (this.attempt ? saved.score - this.attempt.start.score : 0));
        if (!Number.isSafeInteger(this.completedScore)) this.completedScore = 0;
        if (!versioned || versioned.version < 3) {
            // Прежний счёт был суммарным: сохраняем только очки незавершённого эпизода.
            const baseline = this.attempt?.start.score ?? this.data.score;
            this.data.score -= baseline;
            if (this.attempt) {
                this.attempt.start.score = 0;
                if (this.attempt.checkpoint) this.attempt.checkpoint.score -= baseline;
            }
        }
        if (updatedStars) this.save();
    }

    public getProgress(): ProgressData { return structuredClone(this.data); }
    public getTotalScore(): number { return this.completedScore + (this.attempt ? this.data.score : 0); }
    public getAttempt(): AttemptData | null { return structuredClone(this.attempt); }
    public getBestScore(episodeId: number): number { return this.bestScores[String(episodeId)] ?? 0; }
    public getEpisodeScore(episodeId: number): number {
        return this.attempt?.episodeId === episodeId ? this.data.score : this.getBestScore(episodeId);
    }
    public save(): boolean {
        return this.saves.saveProfileData("progress", this.getSavedData());
    }

    private getSavedData(): SavedProgress {
        return structuredClone({ ...this.data, version: 8, collectedTotal: this.collectedTotal, completedScore: this.completedScore,
            spentTotal: this.spentTotal, attempt: this.attempt, bestScores: this.bestScores });
    }

    public preparePurchase(amount: number): SavedProgress | null {
        if (!Number.isSafeInteger(amount) || amount < 0 || amount > this.data.crystals) return null;
        const next = this.getSavedData();
        next.crystals -= amount;
        next.spentTotal = this.spentTotal + amount;
        return next;
    }

    private getTotals(): RunTotals {
        return { score: this.data.score, crystals: this.data.crystals, collectedTotal: this.collectedTotal };
    }

    private applyTotals(totals: RunTotals): void {
        this.data.score = totals.score;
        // При откате нельзя вернуть оплату уже приобретённого героя.
        // История получения нужна для отката покупок, но не ограничивает новое пополнение баланса.
        this.collectedTotal = Math.max(totals.collectedTotal, this.spentTotal);
        this.data.crystals = this.collectedTotal - this.spentTotal;
    }

    public beginAttempt(episodeId: number, heroId: string, position: RunPosition): void {
        if (!hasHero(heroId) || !this.data.unlockedEpisodes.includes(episodeId) || !isPosition(position, episodeId)) {
            throw new Error("Недопустимые параметры прохождения");
        }
        if (this.attempt) this.applyTotals(this.attempt.start);
        this.data.score = 0;
        this.attempt = { episodeId, heroId, start: this.getTotals(), collectedIds: [], checkpoint: null,
            resume: { ...position }, defeatedIds: [], enemies: [], boss: null, health: rules.lives, damaged: false };
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
        if (this.data.crystals < rules.crystal.gameLimit) {
            this.collectedTotal++;
            this.data.crystals++;
        }
        return true;
    }

    public saveCheckpoint(id: string, position: RunPosition, health = rules.lives): boolean {
        if (!Number.isFinite(health) || health <= 0 || health > rules.lives || !Number.isInteger(health * 2)) return false;
        if (!this.attempt || !isPosition(position, this.attempt.episodeId)
            || id !== checkpointId(this.attempt.episodeId, position.screenIndex)
            || !getEpisode(this.attempt.episodeId).screens[position.screenIndex].checkpoint) return false;
        this.attempt.checkpoint = {
            ...this.getTotals(), health, position: { ...position }, collectedIds: [...this.attempt.collectedIds], checkpointId: id,
            defeatedIds: [...this.attempt.defeatedIds!], enemies: structuredClone(this.attempt.enemies!), boss: structuredClone(this.attempt.boss ?? null)
        };
        this.attempt.health = health;
        this.attempt.resume = { ...position };
        return this.save();
    }

    public restoreCheckpoint(): RunSnapshot | null {
        const cp = this.attempt?.checkpoint;
        if (!cp || !this.attempt) return null;
        this.applyTotals(cp);
        this.attempt.collectedIds = [...cp.collectedIds];
        this.attempt.defeatedIds = [...(cp.defeatedIds ?? [])];
        this.attempt.enemies = structuredClone(cp.enemies ?? []);
        this.attempt.boss = structuredClone(cp.boss ?? null);
        this.attempt.health = cp.health ?? rules.lives;
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

    public completeAttempt(): EpisodeResult | null {
        const attempt = this.attempt;
        if (!attempt) return null;
        const episode = getEpisode(attempt.episodeId);
        const bossPoints = bosses.bosses[episode.boss as keyof typeof bosses.bosses].points;
        const maxScore = bossPoints + episode.screens.reduce((sum, screen) => sum
            + screen.crystals.length * rules.crystal.points
            + screen.enemies.reduce((points, enemy) => points + getEnemy(enemy.type).points, 0), 0);
        if (!Number.isSafeInteger(this.completedScore + this.data.score + bossPoints)) return null;
        {
            this.addScore(bossPoints);
            const credited = Math.min(bosses.reward.crystals, rules.crystal.gameLimit - this.data.crystals);
            this.collectedTotal += credited;
            this.data.crystals += credited;
        }
        const score = this.data.score;
        const crystals = attempt.collectedIds.length + bosses.reward.crystals;
        const crystalCount = episode.crystalsTotal + bosses.reward.crystals;
        const threshold = rules.starScore[String(attempt.episodeId) as keyof typeof rules.starScore];
        const stars = 1 + Number(crystals === crystalCount) + Number(score >= threshold);
        const id = String(attempt.episodeId);
        this.data.stars[id] = Math.max(this.data.stars[id] ?? 0, stars);
        this.bestScores[id] = Math.max(this.bestScores[id] ?? 0, score);
        const nextEpisodeId = attempt.episodeId < 4 ? attempt.episodeId + 1 : null;
        if (nextEpisodeId && !this.data.unlockedEpisodes.includes(nextEpisodeId)) {
            this.data.unlockedEpisodes.push(nextEpisodeId);
        }
        // Начисленное закрепляется: следующая попытка уже не откатывает завершённую.
        this.completedScore += score;
        this.attempt = null;
        const saved = this.save();
        return { episodeId: attempt.episodeId, score, maxScore, crystals, crystalCount,
            stars, bestScore: this.bestScores[id], nextEpisodeId, saved };
    }

    public addScore(amount: number): void {
        if (Number.isSafeInteger(amount) && amount >= 0 && Number.isSafeInteger(this.data.score + amount)
            && Number.isSafeInteger(this.completedScore + this.data.score + amount)) {
            this.data.score += amount;
        }
    }

    public defeatEnemy(id: string): boolean {
        const attempt = this.attempt;
        if (!attempt || attempt.defeatedIds!.includes(id)) return false;
        const spawn = getEnemySpawns(getEpisode(attempt.episodeId)).get(id);
        if (!spawn) return false;
        this.addScore(getEnemy(spawn.type).points);
        attempt.defeatedIds!.push(id);
        return true;
    }

    public setEnemySnapshot(enemies: EnemySnapshot[]): void {
        if (this.attempt) this.attempt.enemies = structuredClone(enemies);
    }

    public setPlayerHealth(health: number): void {
        if (this.attempt && health > 0 && health <= rules.lives) this.attempt.health = health;
    }

    public setBossSnapshot(boss: BossSnapshot | null): void {
        if (this.attempt) this.attempt.boss = structuredClone(boss);
    }

    public markDamaged(): void { if (this.attempt) this.attempt.damaged = true; }

    public spendCrystals(amount: number): boolean {
        if (!Number.isSafeInteger(amount) || amount < 0 || amount > this.data.crystals) return false;
        this.data.crystals -= amount;
        this.spentTotal += amount;
        return true;
    }
}
