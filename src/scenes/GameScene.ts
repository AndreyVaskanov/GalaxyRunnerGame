import Phaser from "phaser";
import GameManager, { GameState } from "../managers/GameManager";
import SceneManager from "../managers/SceneManager";
import LevelManager from "../managers/LevelManager";
import EnemyManager from "../managers/EnemyManager";
import PlayerController from "../controllers/PlayerController";
import { appServices } from "../AppServices";
import { preloadHero } from "../characters/CharacterAssets";

export default abstract class GameScene extends Phaser.Scene {
    private readonly episodeId: number;
    private gameManager!: GameManager;

    constructor(key: string, episodeId: number) {
        super(key);
        this.episodeId = episodeId;
    }

    preload(): void {
        const character = SceneManager.getSelectedCharacter();
        preloadHero(this, character.id, character.sprite);
        LevelManager.preloadEpisode(this, this.episodeId);
    }

    create(): void {
        const enemies = new EnemyManager();
        const player = new PlayerController(this, appServices.settings, enemies, SceneManager.getSelectedCharacter());
        const levels = new LevelManager(this, enemies);
        this.gameManager = new GameManager(levels, player, enemies, appServices.progress, appServices.audio);
        SceneManager.setGameManager(this.gameManager, this.scene.key);
        this.gameManager.startLevel(this.episodeId);

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
        this.add.rectangle(0, 0, 1920, 90, 0x080D17, 0.8).setOrigin(0);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            keyboard.off(pauseEvent, pause);
            keyboard.removeKey(pauseKey, true);
            SceneManager.setGameManager(null);
            this.gameManager.destroy();
        });
    }

    update(_time: number, delta: number): void {
        this.gameManager.update(delta);
        if (this.gameManager.getState() !== GameState.Play) {
            if (!this.physics.world.isPaused) this.physics.pause();
            return;
        }
        if (this.physics.world.isPaused) this.physics.resume();
    }
}
