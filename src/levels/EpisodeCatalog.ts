import episode1 from "../data/levels/episode1.json";
import episode2 from "../data/levels/episode2.json";
import episode3 from "../data/levels/episode3.json";
import episode4 from "../data/levels/episode4.json";
import type { EpisodeConfig, LevelScreenConfig } from "../interface/EpisodeConfig";

export { GAME_SCALE as LEVEL_SCALE } from "../config/GameScale";

function record(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function number(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function point(value: unknown): value is Record<string, unknown> & { x: number; y: number } {
    return record(value) && number(value.x) && number(value.y);
}

function isScreen(value: unknown): value is LevelScreenConfig {
    if (!record(value)) return false;
    return Array.isArray(value.platforms) && value.platforms.every(p => point(p) && record(p) && number(p.w) && p.w > 0)
        && Array.isArray(value.obstacles) && value.obstacles.every(p => point(p) && record(p)
            && typeof p.type === "string" && number(p.w) && p.w > 0 && number(p.h) && p.h > 0
            && (p.toggleSec === undefined || (number(p.toggleSec) && p.toggleSec > 0)))
        && Array.isArray(value.crystals) && value.crystals.every(point)
        && Array.isArray(value.enemies) && value.enemies.every(p => point(p) && record(p)
            && typeof p.type === "string" && (p.facing === "left" || p.facing === "right"))
        && (value.checkpoint === null || (record(value.checkpoint) && number(value.checkpoint.x)))
        && (value.bossSpawn === undefined || point(value.bossSpawn));
}

export function validateEpisode(value: unknown): value is EpisodeConfig {
    if (!record(value)) return false;
    return Number.isInteger(value.episode) && Number(value.episode) > 0
        && [value.name, value.biome, value.hero, value.boss, value.background].every(v => typeof v === "string" && v.length > 0)
        && (value.heroOnly === undefined || typeof value.heroOnly === "string")
        && Array.isArray(value.screens) && value.screens.length === 3 && value.screens.every(isScreen)
        && Array.isArray(value.screenSize) && value.screenSize.length === 2
        && value.screenSize.every(v => number(v) && v > 0)
        && number(value.groundY) && value.groundY > 0 && value.groundY < Number(value.screenSize[1])
        && Number.isInteger(value.crystalsTotal) && Number(value.crystalsTotal) >= 0;
}

const episodes: unknown[] = [episode1, episode2, episode3, episode4];

export function getEpisode(id: number): EpisodeConfig {
    const data = episodes.find(value => record(value) && value.episode === id);
    if (!validateEpisode(data)) throw new Error(`Некорректная конфигурация эпизода ${id}`);
    // Преобразования координат и перезапуски не должны менять исходные JSON.
    return structuredClone(data);
}

export function getEpisodeScreen(id: number, screenIndex: number): { episode: EpisodeConfig; screen: LevelScreenConfig } {
    const episode = getEpisode(id);
    if (!Number.isInteger(screenIndex) || screenIndex < 0 || screenIndex >= episode.screens.length) {
        throw new Error(`Нет экрана ${screenIndex} в эпизоде ${id}`);
    }
    return { episode, screen: episode.screens[screenIndex] };
}
