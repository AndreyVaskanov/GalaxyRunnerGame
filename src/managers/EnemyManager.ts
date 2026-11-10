import type { EnemySpawn } from "../interface/EpisodeConfig";

export interface ManagedEnemy {
    update(delta: number): void;
    takeDamage(amount: number): void;
    destroy(): void;
}

export type EnemyFactory = (spawn: EnemySpawn) => ManagedEnemy;

export default class EnemyManager {
    private enemies: ManagedEnemy[] = [];
    private active = true;
    private factory: EnemyFactory | null = null;

    // Конкретные враги и боевая логика подключаются отдельно.
    public setFactory(factory: EnemyFactory): void { this.factory = factory; }

    public createEnemies(spawns: EnemySpawn[]): void {
        if (spawns.length > 0 && !this.factory) {
            throw new Error("Не подключено создание противников");
        }
        this.clear();
        for (const spawn of spawns) this.enemies.push(this.factory!(spawn));
    }

    public setActive(active: boolean): void { this.active = active; }

    public damageEnemy(enemy: ManagedEnemy, amount: number): void {
        if (this.active && this.enemies.includes(enemy) && Number.isFinite(amount) && amount > 0) {
            enemy.takeDamage(amount);
        }
    }

    public update(delta: number): void {
        if (this.active) for (const enemy of this.enemies) enemy.update(delta);
    }

    public clear(): void {
        for (const enemy of this.enemies) enemy.destroy();
        this.enemies = [];
    }
}
