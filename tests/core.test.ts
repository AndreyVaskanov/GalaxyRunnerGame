import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getHero, getHeroCatalog, getHeroMovement, hasHero } from "../src/characters/CharacterCatalog";
import { getEpisode, validateEpisode } from "../src/levels/EpisodeCatalog";
import { crystalId } from "../src/levels/LevelObjectIds";
import ProgressSystem from "../src/systems/ProgressSystem";
import SaveSystem from "../src/systems/SaveSystem";

class MemoryStorage {
    private readonly values = new Map<string, string>();

    getItem(key: string): string | null { return this.values.get(key) ?? null; }
    setItem(key: string, value: string): void { this.values.set(key, String(value)); }
    removeItem(key: string): void { this.values.delete(key); }
    clear(): void { this.values.clear(); }
}

const previousStorage = globalThis.localStorage;

beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: new MemoryStorage()
    });
});

afterEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: previousStorage
    });
});

describe("каталог героев", () => {
    it("[UR-2-1, FR-SWR-1-2-1] содержит Кая и возвращает независимую копию каталога", () => {
        expect(hasHero("kai")).toBe(true);
        expect(hasHero("not-a-hero")).toBe(false);

        const catalog = getHeroCatalog();
        catalog[0].name = "изменённое имя";
        expect(getHero("kai").name).not.toBe("изменённое имя");
    });

    it("[FR-SWR-2-1-1, FR-SWR-2-2-1] проверяет параметры движения и неизвестного героя", () => {
        const movement = getHeroMovement(getHero("kai"));
        expect(movement.speed).toBeGreaterThan(0);
        expect(movement.jumpHeight).toBeGreaterThan(0);
        expect(() => getHero("not-a-hero")).toThrow("Неизвестный герой");
    });
});

describe("каталог уровней", () => {
    it("[FR-SWR-1-3-1] проверяет конфигурацию эпизода и неизменность исходных данных", () => {
        const episode = getEpisode(1);
        expect(validateEpisode(episode)).toBe(true);
        episode.screens[0].crystals.pop();
        expect(getEpisode(1).screens[0].crystals.length).toBeGreaterThan(episode.screens[0].crystals.length);
    });

    it("[FR-SWR-1-3-1] отклоняет неизвестный номер эпизода", () => {
        expect(() => getEpisode(99)).toThrow("Некорректная конфигурация эпизода");
    });
});

describe("сохранение попытки", () => {
    it("[FR-SWR-2-4-1, FR-SWR-2-7-1, NFR-SWR-2-6-1] собирает кристалл один раз и восстанавливает попытку", () => {
        const saves = new SaveSystem();
        const progress = new ProgressSystem(saves);
        progress.load();
        progress.beginAttempt(1, "kai", { screenIndex: 0, x: 0, y: 0 });

        const id = crystalId(1, 0, 0);
        expect(progress.collectCrystal(id)).toBe(true);
        expect(progress.collectCrystal(id)).toBe(false);
        expect(progress.collectCrystal("unknown-crystal")).toBe(false);
        expect(progress.getProgress()).toMatchObject({ score: 100, crystals: 1 });

        expect(progress.suspendAttempt({ screenIndex: 0, x: 30, y: 40 })).toBe(true);
        const loaded = new ProgressSystem(saves);
        loaded.load();
        expect(loaded.getAttempt()).toMatchObject({
            episodeId: 1,
            heroId: "kai",
            collectedIds: [id],
            resume: { screenIndex: 0, x: 30, y: 40 }
        });
    });

    it("[UR-2-1, UR-2-2] отклоняет закрытый эпизод и неизвестного героя", () => {
        const progress = new ProgressSystem(new SaveSystem());
        progress.load();
        expect(() => progress.beginAttempt(2, "kai", { screenIndex: 0, x: 0, y: 0 })).toThrow("Недопустимые параметры");
        expect(() => progress.beginAttempt(1, "unknown", { screenIndex: 0, x: 0, y: 0 })).toThrow("Недопустимые параметры");
    });
});
