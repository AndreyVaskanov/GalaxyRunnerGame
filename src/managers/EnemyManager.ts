import type Phaser from "phaser";
import { BOSS_BALANCE as B } from "../config/BossBalance";
import type { EnemySpawn } from "../interface/EpisodeConfig";
import type { BossSnapshot, EnemySnapshot } from "../interface/RunData";
import Boss from "../gameObjects/Boss";
import type { HitPoint } from "../enemies/BossCatalog";
import { bossContactPoint } from "../enemies/BossCatalog";
import Enemy from "../gameObjects/Enemy";
import GolemDrone from "../gameObjects/GolemDrone";
import Projectile from "../gameObjects/Projectile";
import { enemyId } from "../levels/LevelObjectIds";
import { GAME_SCALE } from "../config/GameScale";

export type ManagedEnemy = Enemy | Boss;
type CombatEvent = { type: "defeated"; id: string } | { type: "bossDefeated" }
    | { type: "playerHit"; amount: number } | { type: "push"; vx: number; vy: number }
    | { type: "stomp"; enemy: ManagedEnemy };

export default class EnemyManager {
    private readonly scene: Phaser.Scene;
    private enemies: Enemy[] = [];
    private boss: Boss | null = null;
    private summonSequence = 0;
    private shotCallbacks = new Map<Projectile, (enemy: ManagedEnemy, hit: HitPoint) => void>();
    private shots: Projectile[] = [];
    private playerShots: Projectile[] = [];
    private colliders: Phaser.Physics.Arcade.Collider[] = [];
    private terrain: Phaser.GameObjects.GameObject[] = [];
    private player: Phaser.Physics.Arcade.Body | null = null;
    private events: CombatEvent[] = [];
    private active = true;
    private stompCooldown = 0;

    constructor(scene: Phaser.Scene) { this.scene = scene; }

    public createEnemies(spawns: EnemySpawn[], episodeId: number, screenIndex: number,
        player: Phaser.Physics.Arcade.Body, terrain: Phaser.GameObjects.GameObject[], states: EnemySnapshot[] = [], defeatedIds: string[] = []): void {
        this.clear();
        this.player = player;
        this.terrain = terrain;
        const defeated = new Set(defeatedIds);
        spawns.forEach((spawn, index) => {
            const id = enemyId(episodeId, screenIndex, index);
            if (defeated.has(id)) return;
            const enemy = new Enemy(this.scene, spawn, id, states.find(state => state.id === id));
            this.enemies.push(enemy);
            if (!enemy.isFlying()) {
                this.colliders.push(this.scene.physics.add.collider(enemy.sprite, terrain));
                const surface = terrain.map(object => object.body as Phaser.Physics.Arcade.StaticBody)
                    .filter(body => body && spawn.x * GAME_SCALE >= body.left && spawn.x * GAME_SCALE <= body.right
                        && Math.abs(body.top - spawn.y * GAME_SCALE) < 5)
                    .sort((a, b) => a.width - b.width)[0];
                if (surface) enemy.setPatrolBounds(surface.left + enemy.body.halfWidth, surface.right - enemy.body.halfWidth);
            }
            this.colliders.push(this.scene.physics.add.overlap(player, enemy.sprite, () => {
                if (!this.active || enemy.getHealth() <= 0) return;
                const body = enemy.body;
                const fromAbove = player.velocity.y > 0 && player.prev.y + player.height <= body.top + B.shared.stompTopToleranceWorld;
                if (fromAbove) {
                    if (this.stompCooldown <= 0) { this.stompCooldown = B.shared.stompCooldownMs; this.events.push({ type: "stomp", enemy }); }
                } else this.events.push({ type: "playerHit", amount: 1 });
            }));
        });
    }

    public createBoss(type: string, x: number, y: number, width: number, state?: BossSnapshot | null): void {
        const boss = this.boss = new Boss(this.scene, type, x, y, width, state);
        if (boss.solidParts.length) {
            for (const part of boss.solidParts) this.colliders.push(this.scene.physics.add.collider(this.player!, part));
            return;
        }
        this.colliders.push(this.scene.physics.add.overlap(this.player!, boss.sprite, () => {
            if (!this.active || !boss.body.enable || boss.getHealth() <= 0) return;
            const player = this.player!;
            const contact = boss.getPlayerContact(player);
            if (!contact) return;
            if (contact.fromAbove) {
                if (this.stompCooldown <= 0) { this.stompCooldown = B.shared.stompCooldownMs; this.events.push({ type: "stomp", enemy: boss }); }
            } else {
                const damage = B.shared.contactDamage[boss.definition.type];
                if (damage > 0) this.events.push({ type: "playerHit", amount: damage });
            }
        }));
    }

    private bindShot(shot: Projectile, enemy: ManagedEnemy, confirmHit: (enemy: ManagedEnemy, hit: HitPoint) => void): void {
        shot.addCollider(this.scene.physics.add.overlap(shot.sprite, enemy instanceof Boss ? enemy.hitZone : enemy.sprite, () => {
            if (!this.active || !shot.alive || enemy.getHealth() <= 0) return;
            const center = { x: shot.sprite.x, y: shot.sprite.y };
            const hit = enemy instanceof Boss
                ? bossContactPoint(enemy.hitZone.body as Phaser.Physics.Arcade.StaticBody, center)
                : center;
            shot.destroy();
            confirmHit(enemy, hit);
        }));
    }

    public registerPlayerShot(shot: Projectile, confirmHit: (enemy: ManagedEnemy, hit: HitPoint) => void): void {
        this.playerShots.push(shot);
        this.shotCallbacks.set(shot, confirmHit);
        shot.addCollider(this.scene.physics.add.collider(shot.sprite, this.terrain, () => shot.destroy()));
        for (const enemy of this.enemies) this.bindShot(shot, enemy, confirmHit);
        if (this.boss) this.bindShot(shot, this.boss, confirmHit);
    }

    public setActive(active: boolean): void { this.active = active; }

    public damageEnemy(enemy: ManagedEnemy, amount: number, hit?: HitPoint): void {
        if (!this.active || !(enemy === this.boss || this.enemies.includes(enemy as Enemy)) || !Number.isFinite(amount) || amount <= 0) return;
        if (enemy instanceof Boss) {
            if (!hit || !enemy.takeDamage(amount, hit)) return;
            if (enemy.getHealth() <= 0) {
                this.events.push({ type: "bossDefeated" });
                this.boss = null;
                enemy.playDefeat();
                enemy.destroy();
            }
            return;
        }
        enemy.takeDamage(amount);
        if (enemy.getHealth() <= 0) {
            if (!enemy.id.startsWith("summon:")) this.events.push({ type: "defeated", id: enemy.id });
            this.enemies = this.enemies.filter(item => item !== enemy);
            enemy.destroy();
        }
    }

    public update(delta: number): void {
        if (!this.active || !this.player) return;
        this.stompCooldown = Math.max(0, this.stompCooldown - delta);
        for (const enemy of this.enemies) for (const [vx, vy] of enemy.update(delta, this.player)) {
            if (this.shots.length >= B.shared.maxEnemyProjectiles) break;
            const origin = enemy.getShotOrigin(vx, vy);
            const shot = new Projectile(this.scene, origin.x, origin.y, "enemyBullet", vx, vy, (enemy.id.startsWith("summon:") ? B.scrap_golem.summonedProjectileRangePx : 900) * GAME_SCALE,
                enemy.definition.type === "sand_beetle" ? 200 * GAME_SCALE : 0);
            if (enemy.definition.type === "snow_legionnaire") shot.sprite.setTint(0x7fdfff);
            if (enemy.definition.type === "sand_beetle") shot.sprite.setTint(0xc9a36a);
            if (enemy.definition.type === "dark_guard") shot.sprite.setTint(0xbf70ff);
            shot.addCollider(this.scene.physics.add.collider(shot.sprite, this.terrain, () => shot.destroy()));
            shot.addCollider(this.scene.physics.add.overlap(shot.sprite, this.player, () => {
                if (!this.active || !shot.alive) return;
                shot.destroy();
                this.events.push({ type: "playerHit", amount: enemy.id.startsWith("summon:") ? B.scrap_golem.summonedDamage : 1 });
            }));
            this.shots.push(shot);
        }
        if (this.boss) for (const action of this.boss.update(delta, this.player)) {
            if (action.type === "hit") this.events.push({ type: "playerHit", amount: B.shared.attackDamage });
            else if (action.type === "push") this.events.push(action);
            else if (action.type === "summon") {
                if (this.enemies.filter(enemy => enemy.id.startsWith("summon:")).length >= B.scrap_golem.maxSummonedEnemies) continue;
                const enemy = new GolemDrone(this.scene, { type: B.scrap_golem.summonType, x: Math.max(B.scrap_golem.summonMinXWorld, Math.min(B.scrap_golem.summonMaxXWorld, action.x)) / GAME_SCALE,
                    y: action.y / GAME_SCALE, facing: "left" }, `summon:${this.summonSequence++}`);
                this.enemies.push(enemy);
                this.colliders.push(this.scene.physics.add.overlap(this.player, enemy.sprite, () => {
                    if (this.active && enemy.getHealth() > 0) this.events.push({ type: "playerHit", amount: B.scrap_golem.summonedDamage });
                }));
                for (const [shot, callback] of this.shotCallbacks) if (shot.alive) this.bindShot(shot, enemy, callback);
            } else if (action.type === "shot" && this.shots.length < B.shared.maxEnemyProjectiles) {
                const shot = new Projectile(this.scene, action.x, action.y, "enemyBullet", action.vx, action.vy,
                    B.shared.projectileRangePx * GAME_SCALE, action.gravity ?? 0);
                shot.sprite.setScale(B.shared.defaultProjectileScale * GAME_SCALE);
                if (action.size) shot.sprite.setDisplaySize(action.size, action.size);
                if (action.color) shot.sprite.setTint(action.color);
                shot.addCollider(this.scene.physics.add.collider(shot.sprite, this.terrain, () => shot.destroy()));
                shot.addCollider(this.scene.physics.add.overlap(shot.sprite, this.player, () => {
                    if (!this.active || !shot.alive) return;
                    shot.destroy(); this.events.push({ type: "playerHit", amount: B.shared.attackDamage });
                }));
                this.shots.push(shot);
            }
        }
        for (const [shot] of this.shotCallbacks) if (!shot.alive) this.shotCallbacks.delete(shot);
        for (const shot of this.shots) shot.update();
        this.shots = this.shots.filter(shot => shot.alive);
        this.playerShots = this.playerShots.filter(shot => shot.alive);
    }

    public drainEvents(): CombatEvent[] { const events = this.events; this.events = []; return events; }
    public getSnapshot(): EnemySnapshot[] { return this.enemies.filter(enemy => !enemy.id.startsWith("summon:")).map(enemy => enemy.getSnapshot()); }
    public getBossSnapshot(): BossSnapshot | null { return this.boss?.getSnapshot() ?? null; }

    public clear(): void {
        this.boss?.destroy(); this.boss = null; this.shotCallbacks.clear();
        for (const collider of this.colliders) collider.destroy();
        for (const shot of [...this.shots, ...this.playerShots]) shot.destroy();
        for (const enemy of this.enemies) enemy.destroy();
        this.enemies = []; this.shots = []; this.playerShots = []; this.colliders = [];
        this.events = []; this.terrain = []; this.player = null; this.stompCooldown = 0;
    }
}
