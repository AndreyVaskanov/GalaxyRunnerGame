import Phaser from "phaser";
import GameManager, { GameState } from "../managers/GameManager";
import SceneManager from "../managers/SceneManager";
import LevelManager from "../managers/LevelManager";
import EnemyManager from "../managers/EnemyManager";
import PlayerController from "../controllers/PlayerController";
import { appServices } from "../AppServices";
import { preloadHero } from "../characters/CharacterAssets";
import GameHud from "../ui/GameHud";
import type { HeroDefinition } from "../interface/HeroDefinition";

export default abstract class GameScene extends Phaser.Scene {
    private readonly episodeId: number;
    private gameManager!: GameManager;
    private hud!: GameHud;
    private continueSaved = false;
    private character!: HeroDefinition;

    constructor(key: string, episodeId: number) {
        super(key);
        this.episodeId = episodeId;
    }

    init(data: { continueSaved?: boolean }): void {
        this.continueSaved = data.continueSaved === true;
    }

    preload(): void {
        this.character = (this.continueSaved ? SceneManager.getResumeCharacter(this.episodeId) : null)
            ?? SceneManager.getSelectedCharacter();
        preloadHero(this, this.character.id, this.character.sprite);
        LevelManager.preloadEpisode(this, this.episodeId);
    }

    create(): void {
        const enemies = new EnemyManager(this);
        const player = new PlayerController(this, appServices.settings, enemies, this.character);
        const levels = new LevelManager(this, enemies);
        this.gameManager = new GameManager(levels, player, enemies, appServices.progress, appServices.audio);
        SceneManager.setGameManager(this.gameManager, this.scene.key);
        this.gameManager.startLevel(this.episodeId, 0, this.continueSaved);

        const bindings = appServices.settings.getSettings().keys;
        const pauseBindings = [...new Set([bindings.pause, bindings.pauseAlternative].filter(binding => binding && binding !== "MOUSE_LEFT"))];
        const keyboard = this.input.keyboard!;
        const pauseKeys = pauseBindings.map(binding => keyboard.addKey(binding));
        const pauseEvents = pauseBindings.map(binding => `keydown-${binding}`);
        const pause = (event: KeyboardEvent) => {
            if (event.repeat) return;
            event.stopPropagation();
            SceneManager.pauseGame();
        };
        for (const event of pauseEvents) keyboard.on(event, pause);
        const mousePause = (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonDown() && pointer.worldY > 90 && [bindings.pause, bindings.pauseAlternative].includes("MOUSE_LEFT")) {
                SceneManager.pauseGame();
            }
        };
        this.input.on("pointerdown", mousePause);
        this.hud = new GameHud(this, this.character.name);
        const save = () => { this.gameManager.saveSession(); };
        window.addEventListener("pagehide", save);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.off("pointerdown", mousePause);
            for (const event of pauseEvents) keyboard.off(event, pause);
            for (const key of pauseKeys) keyboard.removeKey(key, true);
            window.removeEventListener("pagehide", save);
            SceneManager.setGameManager(null);
            this.gameManager.destroy();
        });
    }

    update(_time: number, delta: number): void {
        this.gameManager.update(delta);
        this.hud.update();
        if (this.gameManager.getState() === GameState.Win) {
            SceneManager.showGameResult();
            return;
        }
        if (this.gameManager.getState() === GameState.Lose) {
            SceneManager.showGameOver();
            return;
        }
        if (this.gameManager.getState() !== GameState.Play) {
            if (!this.physics.world.isPaused) this.physics.pause();
            return;
        }
        if (this.physics.world.isPaused) this.physics.resume();
    }
}
