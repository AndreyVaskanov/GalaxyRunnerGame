import data from "../data/enemies.json";
import type { EpisodeConfig, EnemySpawn } from "../interface/EpisodeConfig";
import { enemyId } from "../levels/LevelObjectIds";

export type EnemyType = keyof typeof data.enemies;

export function getEnemy(type: string) {
    if (!Object.hasOwn(data.enemies, type)) throw new Error(`Неизвестный противник: ${type}`);
    return { type: type as EnemyType, ...data.enemies[type as EnemyType] };
}

export function getEnemySpawns(episode: EpisodeConfig): Map<string, EnemySpawn> {
    return new Map(episode.screens.flatMap((screen, index) =>
        screen.enemies.map((spawn, item) => [enemyId(episode.episode, index, item), spawn] as const)));
}
