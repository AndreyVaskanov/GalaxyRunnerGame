import type Phaser from "phaser";
import { getEpisode } from "../levels/EpisodeCatalog";
import { getEnemy } from "./EnemyCatalog";
import playerBullet from "../assets/sprites/bullet_player.png";
import enemyBullet from "../assets/sprites/bullet_enemy.png";

import { getBoss } from "./BossCatalog";
const bossSprites = import.meta.glob<string>("../assets/sprites/boss_*.png", { eager: true, query: "?url", import: "default" });
const sprites = import.meta.glob<string>("../assets/sprites/enemy_*.png", { eager: true, query: "?url", import: "default" });

export function preloadEnemies(scene: Phaser.Scene, episodeId: number): void {
    const episode = getEpisode(episodeId);
    const boss = getBoss(episode.boss);
    if (!scene.textures.exists(`boss-${episode.boss}`)) scene.load.image(`boss-${episode.boss}`, bossSprites[`../assets/sprites/${boss.sprite}`]!);
    for (const spawn of [...episode.screens.flatMap(screen => screen.enemies), { type: "rust_drone" }]) {
        const definition = getEnemy(spawn.type);
        const key = `enemy-${spawn.type}`;
        const url = sprites[`../assets/sprites/${definition.sprite}`];
        if (!url) throw new Error(`Не найден спрайт противника: ${definition.sprite}`);
        if (!scene.textures.exists(key)) scene.load.image(key, url);
    }
    if (!scene.textures.exists("playerBullet")) scene.load.image("playerBullet", playerBullet);
    if (!scene.textures.exists("enemyBullet")) scene.load.image("enemyBullet", enemyBullet);
}
