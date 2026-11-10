import type LevelManager from "./LevelManager";
import type PlayerController from "../controllers/PlayerController";
import type EnemyManager from "./EnemyManager";
import type ProgressSystem from "../systems/ProgressSystem";
import type AudioManager from "./AudioManager";
import type { EpisodeResult, HudData, RunPosition } from "../interface/RunData";

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
    private message = "";
    private messageTime = 0;
    private result: EpisodeResult | null = null;

    constructor(levels: LevelManager, player: PlayerController, enemies: EnemyManager,
        progress: ProgressSystem, audio: AudioManager) {
        this.levels = levels;
        this.player = player;
        this.enemies = enemies;
        this.progress = progress;
        this.audio = audio;
    }

    public startLevel(episodeId: number, screenIndex = 0, continueSaved = false): void {
        this.result = null;
        const saved = this.progress.getAttempt();
        const restored = continueSaved && saved?.episodeId === episodeId && saved.heroId === this.player.getCharacterId();
        const position = restored ? saved.resume : { ...this.levels.getSpawnPoint(episodeId, screenIndex), screenIndex };
        if (!restored) {
            this.progress.beginAttempt(episodeId, this.player.getCharacterId(), position);
            this.recordSave(this.progress.save());
        }
        this.loadPosition(episodeId, position);
        this.state = GameState.Play;
        this.resume();
    }

    private loadPosition(episodeId: number, position: RunPosition): void {
        const attempt = this.progress.getAttempt();
        this.player.spawn(position.x, position.y);
        this.levels.loadLevel(episodeId, position.screenIndex, this.player.getBody(),
            attempt?.collectedIds, attempt?.checkpoint?.checkpointId);
    }

    private recordSave(saved: boolean): void {
        this.message = saved ? "Прогресс сохранён" : "Не удалось сохранить прогресс в браузере";
        this.messageTime = saved ? 3000 : Infinity;
    }

    public restartLevel(): void {
        const selection = this.levels.getSelection();
        if (!selection) return;
        this.result = null;
        const spawn = this.levels.getSpawnPoint(selection.episodeId, 0);
        const position = { ...spawn, screenIndex: 0 };
        this.progress.restartAttempt(position);
        this.loadPosition(selection.episodeId, position);
        this.recordSave(this.progress.save());
        this.state = GameState.Play;
        this.resume();
    }

    public nextScreen(): boolean {
        const selection = this.levels.getSelection();
        if (this.state !== GameState.Play || !selection || !this.levels.hasNextScreen()) return false;
        const index = selection.screenIndex + 1;
        const spawn = this.levels.getSpawnPoint(selection.episodeId, index);
        this.processLevelEvents();
        const attempt = this.progress.getAttempt();
        this.levels.loadLevel(selection.episodeId, index, this.player.getBody(),
            attempt?.collectedIds, attempt?.checkpoint?.checkpointId);
        this.player.moveTo(spawn.x, spawn.y);
        return true;
    }

    public update(delta: number): void {
        if (this.state !== GameState.Play) return;
        this.messageTime = Math.max(0, this.messageTime - delta);
        if (this.messageTime === 0) this.message = "";
        if (this.player.getHealth() <= 0) {
            this.lose();
            return;
        }
        this.processLevelEvents();
        if (this.state !== GameState.Play) return;
        this.player.update();
        this.enemies.update(delta);
        const body = this.player.getBody();
        if (body.velocity.x > 0 && body.right >= this.levels.getScreenWidth() - 1) this.nextScreen();
    }

    private processLevelEvents(): void {
        for (const event of this.levels.drainEvents()) {
            if (event.type === "crystal") this.progress.collectCrystal(event.id);
            else if (event.type === "checkpoint") this.recordSave(this.progress.saveCheckpoint(event.id, event.position));
            else if (event.type === "technicalFinish" && !this.levels.hasNextScreen()) this.win(true);
        }
    }

    public canRestoreCheckpoint(): boolean { return !!this.progress.getAttempt()?.checkpoint; }

    public restoreCheckpoint(): boolean {
        const checkpoint = this.progress.restoreCheckpoint();
        const attempt = this.progress.getAttempt();
        if (!checkpoint || !attempt) return false;
        this.loadPosition(attempt.episodeId, checkpoint.position);
        this.recordSave(this.progress.save());
        this.state = GameState.Play;
        this.resume();
        return true;
    }

    public saveSession(): boolean {
        this.processLevelEvents();
        if (this.result) return this.result.saved;
        const selection = this.levels.getSelection();
        if (!selection) return false;
        const body = this.player.getBody();
        const saved = this.progress.suspendAttempt({ screenIndex: selection.screenIndex, x: body.center.x, y: body.center.y });
        this.recordSave(saved);
        return saved;
    }

    public getHudData(): HudData {
        const progress = this.progress.getProgress();
        const selection = this.levels.getSelection();
        return { health: this.player.getHealth(), score: progress.score, crystals: progress.crystals,
            episodeId: selection?.episodeId ?? 1, screenIndex: selection?.screenIndex ?? 0, message: this.message };
    }

    public getState(): GameState {
        return this.state;
    }

    public pause(): void {
        if (this.state !== GameState.Play) return;
        this.processLevelEvents();
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

    public getResult(): EpisodeResult | null { return structuredClone(this.result); }

    public win(technicalFinish = false): void {
        if (this.state !== GameState.Play) return;
        const result = this.progress.completeAttempt(technicalFinish);
        if (!result) return;
        this.result = result;
        this.state = GameState.Win;
        this.player.setActive(false);
        this.enemies.setActive(false);
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
