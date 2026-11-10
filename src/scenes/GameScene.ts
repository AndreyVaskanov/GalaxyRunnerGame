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
        const enemies = new EnemyManager();
        const player = new PlayerController(this, appServices.settings, enemies, this.character);
        const levels = new LevelManager(this, enemies);
        this.gameManager = new GameManager(levels, player, enemies, appServices.progress, appServices.audio);
        SceneManager.setGameManager(this.gameManager, this.scene.key);
        this.gameManager.startLevel(this.episodeId, 0, this.continueSaved);

        const pauseBinding = appServices.settings.getSettings().keys.pause;
        const keyboard = this.input.keyboard!;
        const pauseKey = keyboard.addKey(pauseBinding);
        const pauseEvent = `keydown-${pauseBinding}`;
        const pause = (event: KeyboardEvent) => {
            if (event.repeat) return;
            event.stopPropagation();
            SceneManager.pauseGame();
        };
        keyboard.on(pauseEvent, pause);
        this.hud = new GameHud(this, this.character.name);
        const save = () => { this.gameManager.saveSession(); };
        window.addEventListener("pagehide", save);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            keyboard.off(pauseEvent, pause);
            keyboard.removeKey(pauseKey, true);
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
