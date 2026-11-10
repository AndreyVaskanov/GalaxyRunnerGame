import type Phaser from "phaser";
import Ground from "../gameObjects/Ground";
import Platform from "../gameObjects/Platform";
import type { CheckpointData } from "../interface/GameData";
import type { LevelEvent } from "../interface/RunData";
import { crystalId, checkpointId } from "../levels/LevelObjectIds";
import type EnemyManager from "./EnemyManager";
import { getEpisode, getEpisodeScreen, LEVEL_SCALE } from "../levels/EpisodeCatalog";
import { getBackgroundUrl, backgroundKey, preloadLevelObjects } from "../levels/EpisodeAssets";
import { ENABLE_TECHNICAL_FINISH } from "../config/Development";

export interface LevelSelection {
    episodeId: number;
    screenIndex: number;
}

const terrainColors: Record<string, [number, number]> = {
    desert: [0xa86b00, 0x754a00], ice: [0x9ccad9, 0x557c99],
    station: [0x4b5268, 0x282d40], junk: [0x76634f, 0x40352d]
};

export default class LevelManager {
    private readonly scene: Phaser.Scene;
    private readonly enemies: EnemyManager;
    private selection: LevelSelection | null = null;
    private screenWidth = 0;
    private screenCount = 0;
    private objects: (Ground | Platform)[] = [];
    private colliders: Phaser.Physics.Arcade.Collider[] = [];
    private background: Phaser.GameObjects.Image | null = null;
    private checkpoint: CheckpointData | null = null;
    private pickups: Phaser.GameObjects.Image[] = [];
    private events: LevelEvent[] = [];
    private technicalFinishObjects: Phaser.GameObjects.GameObject[] = [];

    constructor(scene: Phaser.Scene, enemies: EnemyManager) {
        this.scene = scene;
        this.enemies = enemies;
    }

    public static preloadEpisode(scene: Phaser.Scene, episodeId: number): void {
        const episode = getEpisode(episodeId);
        const key = backgroundKey(episodeId);
        if (!scene.textures.exists(key)) scene.load.image(key, getBackgroundUrl(episode.background));
        preloadLevelObjects(scene);
    }

    public getSpawnPoint(episodeId: number, screenIndex = 0): { x: number; y: number } {
        const { episode } = getEpisodeScreen(episodeId, screenIndex);
        // В исходном JSON нет spawn героя: временная позиция у левого края над землёй.
        return { x: 100 * LEVEL_SCALE, y: (episode.groundY - 40) * LEVEL_SCALE };
    }

    public loadLevel(episodeId: number, screenIndex: number, playerBody: Phaser.Physics.Arcade.Body,
        collectedIds: string[] = [], activeCheckpointId: string | null = null): void {
        const { episode, screen } = getEpisodeScreen(episodeId, screenIndex);
        const colors = terrainColors[episode.biome];
        if (!colors) throw new Error(`Неизвестная локация ${episode.biome}`);
        const textureKey = backgroundKey(episodeId);
        if (!this.scene.textures.exists(textureKey)) throw new Error(`Фон эпизода ${episodeId} не загружен`);

        // Проверки до очистки: ошибочный запрос не уничтожает текущий экран.
        this.clear();
        this.selection = { episodeId, screenIndex };
        const width = episode.screenSize[0] * LEVEL_SCALE;
        const height = episode.screenSize[1] * LEVEL_SCALE;
        const groundY = episode.groundY * LEVEL_SCALE;
        this.screenWidth = width;
        this.screenCount = episode.screens.length;
        this.scene.physics.world.setBounds(0, 0, width, height);
        this.background = this.scene.add.image(0, 0, textureKey).setOrigin(0).setDisplaySize(width, height).setDepth(-1);
        this.objects.push(new Ground(this.scene, width, height - groundY, groundY, ...colors));
        for (const platform of screen.platforms) {
            this.objects.push(new Platform(this.scene, {
                x: platform.x * LEVEL_SCALE, y: platform.y * LEVEL_SCALE,
                width: platform.w * LEVEL_SCALE,
                // Высота платформенного тайла в материалах — 24 исходных пикселя.
                height: 24 * LEVEL_SCALE, mainColor: colors[0], secondaryColor: colors[1], typeMain: true
            }));
        }
        for (const object of this.objects) this.colliders.push(this.scene.physics.add.collider(playerBody, object));
        const collected = new Set(collectedIds);
        screen.crystals.forEach((point, index) => {
            const id = crystalId(episodeId, screenIndex, index);
            if (collected.has(id)) return;
            const crystal = this.scene.add.image(point.x * LEVEL_SCALE, point.y * LEVEL_SCALE, "crystal").setScale(3 * LEVEL_SCALE);
            this.scene.physics.add.existing(crystal, true);
            this.pickups.push(crystal);
            let taken = false;
            this.colliders.push(this.scene.physics.add.overlap(playerBody, crystal, () => {
                if (taken) return;
                taken = true;
                // Сначала выключаем тело, затем GameManager получает событие ровно один раз.
                (crystal.body as Phaser.Physics.Arcade.StaticBody).enable = false;
                crystal.setVisible(false);
                this.events.push({ type: "crystal", id });
            }));
        });
        if (screen.checkpoint) {
            const id = checkpointId(episodeId, screenIndex);
            let activated = id === activeCheckpointId;
            const flag = this.scene.add.image(screen.checkpoint.x * LEVEL_SCALE, groundY,
                activated ? "checkpointOn" : "checkpointOff").setOrigin(0.5, 1).setScale(5 * LEVEL_SCALE);
            this.scene.physics.add.existing(flag, true);
            this.pickups.push(flag);
            const position = { screenIndex, x: screen.checkpoint.x * LEVEL_SCALE, y: (episode.groundY - 40) * LEVEL_SCALE };
            if (activated) this.activateCheckpoint({ id, x: position.x, y: position.y });
            this.colliders.push(this.scene.physics.add.overlap(playerBody, flag, () => {
                if (activated) return;
                activated = true;
                flag.setTexture("checkpointOn");
                this.activateCheckpoint({ id, x: position.x, y: position.y });
                this.events.push({ type: "checkpoint", id, position });
            }));
        }
        if (ENABLE_TECHNICAL_FINISH && screenIndex === episode.screens.length - 1) {
            this.createTechnicalFinish(width, groundY, playerBody);
        }
        // Враги, препятствия и босс подключаются отдельными этапами.
        this.enemies.createEnemies([]);
    }

    // TODO: удалить вместе с ENABLE_TECHNICAL_FINISH, когда заработают боссы.
    private createTechnicalFinish(width: number, groundY: number, playerBody: Phaser.Physics.Arcade.Body): void {
        const x = width - 180;
        const gate = this.scene.add.rectangle(x, groundY - 105, 100, 210, 0xff00cc, 0.18)
            .setStrokeStyle(4, 0xff00cc);
        this.scene.physics.add.existing(gate, true);
        const stripes = this.scene.add.graphics().lineStyle(5, 0xff00cc, 0.8);
        for (let offset = 0; offset < 210; offset += 24) {
            stripes.lineBetween(x - 48, groundY - offset, x - 26, groundY - offset - 16);
            stripes.lineBetween(x + 26, groundY - offset, x + 48, groundY - offset - 16);
        }
        const label = this.scene.add.text(x, groundY - 240, "DEV / ВРЕМЕННЫЙ ФИНИШ\nЗАМЕНА БОССА · УДАЛИТЬ", {
            fontFamily: "monospace", fontSize: "20px", color: "#FF66E5", align: "center",
            backgroundColor: "#20031D", padding: { x: 12, y: 8 }
        }).setOrigin(0.5, 1);
        this.technicalFinishObjects.push(gate, stripes, label);
        let activated = false;
        this.colliders.push(this.scene.physics.add.overlap(playerBody, gate, () => {
            if (activated) return;
            activated = true;
            this.events.push({ type: "technicalFinish" });
        }));
    }

    public getSelection(): LevelSelection | null { return this.selection ? { ...this.selection } : null; }

    public hasNextScreen(): boolean {
        return this.selection !== null
            && this.selection.screenIndex + 1 < this.screenCount;
    }

    public getScreenWidth(): number {
        return this.screenWidth;
    }

    public restartLevel(playerBody: Phaser.Physics.Arcade.Body): void {
        if (this.selection) this.loadLevel(this.selection.episodeId, 0, playerBody);
    }

    public activateCheckpoint(checkpoint: CheckpointData): void { this.checkpoint = { ...checkpoint }; }
    public getCheckpoint(): CheckpointData | null { return this.checkpoint ? { ...this.checkpoint } : null; }

    public drainEvents(): LevelEvent[] {
        const events = this.events;
        this.events = [];
        // Сбор предметов того же физического шага должен войти в снимок чекпоинта.
        const order = { crystal: 0, checkpoint: 1, technicalFinish: 2 };
        return events.sort((a, b) => order[a.type] - order[b.type]);
    }

    public clear(): void {
        for (const collider of this.colliders) collider.destroy();
        for (const object of this.objects) object.destroy();
        for (const pickup of this.pickups) pickup.destroy();
        for (const object of this.technicalFinishObjects) object.destroy();
        this.technicalFinishObjects = [];
        this.pickups = [];
        this.events = [];
        this.background?.destroy();
        this.background = null;
        this.colliders = [];
        this.objects = [];
        this.checkpoint = null;
        this.selection = null;
        this.screenWidth = 0;
        this.screenCount = 0;
        this.enemies.clear();
    }
}
