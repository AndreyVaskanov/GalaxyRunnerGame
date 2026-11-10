import Phaser from "phaser";
import GameManager, { GameState } from "./GameManager";
import { appServices } from "../AppServices";
import type { GameSettings, CharacterDefinition } from "../interface/GameData";

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
        if (SceneManager.gameSceneKey === from) SceneManager.sceneManager.stop("Pause");
        SceneManager.sceneManager.stop(from);
        SceneManager.sceneManager.start(to);
    }

    public static restartGame(): void {
        const game = SceneManager.gameManager;
        const key = SceneManager.gameSceneKey;
        if (!game || !key) return;
        game.restartLevel();
        SceneManager.sceneManager.stop("Pause");
        SceneManager.sceneManager.resume(key);
    }

    public static exitToChapterMap(): void {
        const key = SceneManager.gameSceneKey;
        if (!key) return;
        SceneManager.showScene(key, "ChapterMap");
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
