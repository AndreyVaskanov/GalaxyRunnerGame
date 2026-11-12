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
    it("содержит Кая и возвращает независимую копию каталога", () => {
        expect(hasHero("kai")).toBe(true);
        expect(hasHero("not-a-hero")).toBe(false);

        const catalog = getHeroCatalog();
        catalog[0].name = "изменённое имя";
        expect(getHero("kai").name).not.toBe("изменённое имя");
    });

    it("считает положительные параметры движения и отклоняет неизвестного героя", () => {
        const movement = getHeroMovement(getHero("kai"));
        expect(movement.speed).toBeGreaterThan(0);
        expect(movement.jumpHeight).toBeGreaterThan(0);
        expect(() => getHero("not-a-hero")).toThrow("Неизвестный герой");
    });
});

describe("каталог уровней", () => {
    it("проверяет загруженный эпизод и не отдаёт изменяемые исходные данные", () => {
        const episode = getEpisode(1);
        expect(validateEpisode(episode)).toBe(true);
        episode.screens[0].crystals.pop();
        expect(getEpisode(1).screens[0].crystals.length).toBeGreaterThan(episode.screens[0].crystals.length);
    });

    it("отклоняет неизвестный номер эпизода", () => {
        expect(() => getEpisode(99)).toThrow("Некорректная конфигурация эпизода");
    });
});

describe("сохранение попытки", () => {
    it("засчитывает кристалл только один раз и восстанавливает попытку из сохранения", () => {
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

    it("не начинает попытку с закрытым эпизодом или неизвестным героем", () => {
        const progress = new ProgressSystem(new SaveSystem());
        progress.load();
        expect(() => progress.beginAttempt(2, "kai", { screenIndex: 0, x: 0, y: 0 })).toThrow("Недопустимые параметры");
        expect(() => progress.beginAttempt(1, "unknown", { screenIndex: 0, x: 0, y: 0 })).toThrow("Недопустимые параметры");
    });
});
