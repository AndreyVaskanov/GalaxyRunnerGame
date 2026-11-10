import data from "../data/heroes.json";
import type { HeroDefinition, HeroMovement } from "../interface/HeroDefinition";
import { GAME_SCALE } from "../config/GameScale";

const characters: HeroDefinition[] = Object.entries(data.heroes).map(([id, hero]) => ({
    id, ...hero, ...(hero.unlock === "after_episode_3_shop" ? { requiredEpisode: 3 } : {})
}));

export function getHeroCatalog(): HeroDefinition[] { return structuredClone(characters); }

export function hasHero(id: string): boolean { return characters.some(hero => hero.id === id); }

export function getHero(id: string): HeroDefinition {
    const hero = characters.find(hero => hero.id === id);
    if (!hero) throw new Error(`Неизвестный герой: ${id}`);
    return { ...hero };
}

export function getHeroMovement(hero: HeroDefinition): HeroMovement {
    const speed = data.rules.speedPxPerSec[String(hero.speed) as keyof typeof data.rules.speedPxPerSec];
    const height = data.rules.jumpHeightPx[String(hero.jump) as keyof typeof data.rules.jumpHeightPx];
    if (!Number.isFinite(speed) || !Number.isFinite(height)) throw new Error(`Некорректные характеристики героя ${hero.id}`);
    return { speed: speed * GAME_SCALE, jumpHeight: height * GAME_SCALE };
}

export function getJumpVelocity(height: number, gravity: number): number {
    if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(gravity) || gravity <= 0) {
        throw new Error("Для прыжка требуются положительные высота и гравитация");
    }
    return Math.sqrt(2 * gravity * height);
}

export const heroAnimation = {
    frameWidth: data.rules.frameSize[0], frameHeight: data.rules.frameSize[1],
    runStart: 1, runEnd: data.rules.runAnimation.frames, runFps: data.rules.runAnimation.fps,
    idleFrame: 0, jumpFrame: 5,
    scale: 5 * GAME_SCALE
};
