import type LevelManager from "./LevelManager";
import type PlayerController from "../controllers/PlayerController";
import type EnemyManager from "./EnemyManager";
import type ProgressSystem from "../systems/ProgressSystem";
import type AudioManager from "./AudioManager";

export enum GameState {
    Play,
    Pause,
    Win,
    Lose
}

export default class GameManager {

    private state: GameState = GameState.Play;
    private readonly levels: LevelManager;
    private readonly player: PlayerController;
    private readonly enemies: EnemyManager;
    private readonly progress: ProgressSystem;
    private readonly audio: AudioManager;

    constructor(levels: LevelManager, player: PlayerController, enemies: EnemyManager,
        progress: ProgressSystem, audio: AudioManager) {
        this.levels = levels;
        this.player = player;
        this.enemies = enemies;
        this.progress = progress;
        this.audio = audio;
    }

    public startLevel(episodeId: number, screenIndex = 0): void {
        const spawn = this.levels.getSpawnPoint(episodeId, screenIndex);
        this.player.spawn(spawn.x, spawn.y);
        this.levels.loadLevel(episodeId, screenIndex, this.player.getBody());
        this.state = GameState.Play;
        this.resume();
    }

    public restartLevel(): void {
        const selection = this.levels.getSelection();
        if (!selection) return;
        const spawn = this.levels.getSpawnPoint(selection.episodeId, 0);
        this.player.spawn(spawn.x, spawn.y);
        this.levels.restartLevel(this.player.getBody());
        this.state = GameState.Play;
        this.resume();
    }

    public nextScreen(): boolean {
        const selection = this.levels.getSelection();
        if (this.state !== GameState.Play || !selection || !this.levels.hasNextScreen()) return false;
        const index = selection.screenIndex + 1;
        const spawn = this.levels.getSpawnPoint(selection.episodeId, index);
        this.levels.loadLevel(selection.episodeId, index, this.player.getBody());
        this.player.moveTo(spawn.x, spawn.y);
        return true;
    }

    public update(delta: number): void {
        if (this.state !== GameState.Play) return;
        if (this.player.getHealth() <= 0) {
            this.lose();
            return;
        }
        this.player.update();
        this.enemies.update(delta);
        const body = this.player.getBody();
        if (body.velocity.x > 0 && body.right >= this.levels.getScreenWidth() - 1) this.nextScreen();
    }

    public getState(): GameState {
        return this.state;
    }

    public pause(): void {
        if (this.state !== GameState.Play) return;
        this.state = GameState.Pause
        this.player.setActive(false);
        this.enemies.setActive(false);
    }

    public resume(): void {
        if (this.state !== GameState.Play && this.state !== GameState.Pause) return;
     this.state = GameState.Play;
        this.player.setActive(true);
        this.enemies.setActive(true);
    }

    public win(): void {
        if (this.state !== GameState.Play) return;
        this.state = GameState.Win;
        this.player.setActive(false);
        this.enemies.setActive(false);
        this.progress.save();
    }

    public lose(): void {
        if (this.state !== GameState.Play) return;
        this.state = GameState.Lose;
        this.player.setActive(false);
        this.enemies.setActive(false);
    }

    public playEffect(key: string): void { this.audio.playEffect(key); }

    public destroy(): void {
        this.levels.clear();
        this.player.destroy();
    }
}
