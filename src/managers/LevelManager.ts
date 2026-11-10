import type Phaser from "phaser";
import Ground from "../gameObjects/Ground";
import Platform from "../gameObjects/Platform";
import type { CheckpointData } from "../interface/GameData";
import type EnemyManager from "./EnemyManager";
import { getEpisode, getEpisodeScreen, LEVEL_SCALE } from "../levels/EpisodeCatalog";
import { getBackgroundUrl, backgroundKey } from "../levels/EpisodeAssets";

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

    constructor(scene: Phaser.Scene, enemies: EnemyManager) {
        this.scene = scene;
        this.enemies = enemies;
    }

    public static preloadEpisode(scene: Phaser.Scene, episodeId: number): void {
        const episode = getEpisode(episodeId);
        const key = backgroundKey(episodeId);
        if (!scene.textures.exists(key)) scene.load.image(key, getBackgroundUrl(episode.background));
    }

    public getSpawnPoint(episodeId: number, screenIndex = 0): { x: number; y: number } {
        const { episode } = getEpisodeScreen(episodeId, screenIndex);
        // В исходном JSON нет spawn героя: временная позиция у левого края над землёй.
        return { x: 100 * LEVEL_SCALE, y: (episode.groundY - 40) * LEVEL_SCALE };
    }

    public loadLevel(episodeId: number, screenIndex: number, playerBody: Phaser.Physics.Arcade.Body): void {
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
        // Враги, препятствия, кристаллы и босс описаны в JSON, но подключаются отдельными этапами.
        this.enemies.createEnemies([]);
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

    public clear(): void {
        for (const collider of this.colliders) collider.destroy();
        for (const object of this.objects) object.destroy();
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
