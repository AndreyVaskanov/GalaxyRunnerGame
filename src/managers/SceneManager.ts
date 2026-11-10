import Phaser from "phaser";
import GameManager, { GameState } from "./GameManager";
import { appServices } from "../AppServices";
import type { GameSettings, CharacterDefinition } from "../interface/GameData";
import { getHero } from "../characters/CharacterCatalog";
import { getEpisode } from "../levels/EpisodeCatalog";
import type { EpisodeMapEntry } from "../interface/EpisodeMapEntry";
import bosses from "../data/bosses.json";
import rules from "../data/rules.json";

const episodeScenes = ["Desert1", "Ice2", "Station3", "Junk4"];
const locations: Record<string, string> = {
    desert: "Пустынная планета", ice: "Ледяная планета",
    station: "Боевая станция", junk: "Свалка звездолётов"
};

export default class SceneManager {

    private static sceneManager: Phaser.Scenes.SceneManager
    private static gameManager: GameManager | null = null
    private static gameSceneKey: string | null = null;

    public static initialize (sceneManager: Phaser.Scenes.SceneManager) {
        SceneManager.sceneManager = sceneManager
    }

    public static setGameManager(gameManager: GameManager | null, sceneKey: string | null = null) {
        SceneManager.gameManager = gameManager
        SceneManager.gameSceneKey = gameManager ? sceneKey : null;
    }

    public static getSceneManager(): Phaser.Scenes.SceneManager {
        return SceneManager.sceneManager;
    }

    public static showScene(from: string, to: string): void {
        if (from === to) return;
        if (SceneManager.gameSceneKey === from) {
            SceneManager.sceneManager.stop("Pause");
            SceneManager.sceneManager.stop("GameOver");
        }
        SceneManager.sceneManager.stop(from);
        SceneManager.sceneManager.start(to);
    }

    public static restartGame(): void {
        const game = SceneManager.gameManager;
        const key = SceneManager.gameSceneKey;
        if (!game || !key) return;
        game.restartLevel();
        SceneManager.sceneManager.stop("Pause");
        SceneManager.sceneManager.stop("GameOver");
        SceneManager.sceneManager.resume(key);
    }

    public static exitToChapterMap(): void {
        const key = SceneManager.gameSceneKey;
        if (!key) return;
        SceneManager.gameManager?.saveSession();
        SceneManager.showScene(key, "ChapterMap");
    }

    public static getResumeCharacter(episodeId: number) {
        const attempt = appServices.progress.getAttempt();
        const episode = getEpisode(episodeId);
        return attempt?.episodeId === episodeId && appServices.characters.isOwned(attempt.heroId)
            && appServices.progress.getProgress().unlockedEpisodes.includes(episodeId)
            && (!episode.heroOnly || episode.heroOnly === attempt.heroId)
            ? getHero(attempt.heroId) : null;
    }

    public static canContinueGame(): boolean {
        const attempt = appServices.progress.getAttempt();
        return !!attempt && SceneManager.getResumeCharacter(attempt.episodeId) !== null;
    }

    public static continueGame(from: string): void {
        const attempt = appServices.progress.getAttempt();
        if (attempt) SceneManager.startEpisode(from, attempt.episodeId, true);
    }

    public static getEpisodeMap(): EpisodeMapEntry[] {
        const progress = appServices.progress.getProgress();
        const attempt = appServices.progress.getAttempt();
        const hero = appServices.characters.getSelectedCharacter();
        return episodeScenes.map((_, index) => {
            const episode = getEpisode(index + 1);
            return {
                id: episode.episode, name: episode.name, location: locations[episode.biome],
                bossName: bosses.bosses[episode.boss as keyof typeof bosses.bosses].name,
                stars: progress.stars[String(episode.episode)] ?? 0,
                unlocked: progress.unlockedEpisodes.includes(episode.episode),
                heroAllowed: !episode.heroOnly || episode.heroOnly === hero.id,
                requiredHeroName: episode.heroOnly ? getHero(episode.heroOnly).name : null,
                canContinue: attempt?.episodeId === episode.episode && attempt.heroId === hero.id,
                crystalCount: episode.crystalsTotal,
                starScore: rules.starScore[String(episode.episode) as keyof typeof rules.starScore]
            };
        });
    }

    public static startEpisode(from: string, episodeId: number, continueSaved = false): boolean {
        const key = episodeScenes[episodeId - 1];
        if (!key || !appServices.progress.getProgress().unlockedEpisodes.includes(episodeId)) return false;
        const episode = getEpisode(episodeId);
        const hero = continueSaved ? SceneManager.getResumeCharacter(episodeId) : SceneManager.getSelectedCharacter();
        if (!hero || (episode.heroOnly && episode.heroOnly !== hero.id)) return false;
        SceneManager.sceneManager.stop(from);
        SceneManager.sceneManager.start(key, { continueSaved });
        return true;
    }

    public static getHudData() { return SceneManager.gameManager?.getHudData() ?? null; }
    public static saveProgress(): boolean { return appServices.progress.save(); }

    public static showGameResult(): void {
        const result = SceneManager.gameManager?.getResult();
        const key = SceneManager.gameSceneKey;
        if (!result || !key) return;
        SceneManager.sceneManager.stop("Pause");
        SceneManager.sceneManager.stop(key);
        SceneManager.sceneManager.start("EpisodeComplete", { result });
    }

    public static showGameOver(): void {
        const key = SceneManager.gameSceneKey;
        if (!key || SceneManager.gameManager?.getState() !== GameState.Lose) return;
        SceneManager.sceneManager.pause(key);
        SceneManager.sceneManager.run("GameOver");
        SceneManager.sceneManager.bringToTop("GameOver");
    }
    public static canRestoreCheckpoint(): boolean { return SceneManager.gameManager?.canRestoreCheckpoint() ?? false; }
    public static restoreCheckpoint(): void {
        if (!SceneManager.gameManager?.restoreCheckpoint() || !SceneManager.gameSceneKey) return;
        SceneManager.sceneManager.stop("Pause");
        SceneManager.sceneManager.stop("GameOver");
        SceneManager.sceneManager.resume(SceneManager.gameSceneKey);
    }

    public static getSettings(): GameSettings { return appServices.settings.getSettings(); }
    public static updateSettings(settings: GameSettings): boolean { return appServices.settings.update(settings); }
    public static getProgress() { return appServices.progress.getProgress(); }
    public static getCharacters() { return appServices.characters.getCharacters(); }
    public static getCharacterCatalog() { return appServices.characters.getCatalog(); }
    public static getSelectedCharacter() { return appServices.characters.getSelectedCharacter(); }
    public static isCharacterOwned(id: string): boolean { return appServices.characters.isOwned(id); }
    public static selectCharacter(id: string): boolean { return appServices.characters.select(id); }
    public static canBuyCharacter(character: CharacterDefinition): boolean { return appServices.characters.canBuy(character); }

    public static pauseGame(): void {
        const game = SceneManager.gameManager;
        const key = SceneManager.gameSceneKey;
        if (!game || !key || game.getState() !== GameState.Play) return;
        game.pause();
        if (game.getState() !== GameState.Pause) return;
        // Пауза всей сцены останавливает также её таймеры, tweens и update.
        SceneManager.sceneManager.pause(key);
        SceneManager.sceneManager.run("Pause");
        SceneManager.sceneManager.bringToTop("Pause");
    }

    public static resumeGame(): void {
        const game = SceneManager.gameManager;
        const key = SceneManager.gameSceneKey;
        if (!game || !key || game.getState() !== GameState.Pause) return;
        game.resume();
        SceneManager.sceneManager.stop("Pause");
        SceneManager.sceneManager.resume(key);
    }

}
