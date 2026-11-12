import Phaser from "phaser";
import type { EnemySpawn } from "../interface/EpisodeConfig";
import type { EnemySnapshot } from "../interface/RunData";
import { getEnemy } from "../enemies/EnemyCatalog";
import { GAME_SCALE } from "../config/GameScale";

export default class Enemy {
    public readonly sprite: Phaser.Physics.Arcade.Image;
    public readonly body: Phaser.Physics.Arcade.Body;
    public readonly id: string;
    public readonly definition: ReturnType<typeof getEnemy>;
    private readonly bar: Phaser.GameObjects.Graphics;
    private readonly anchorY: number;
    private facing: number;
    private hp: number;
    private left: number;
    private right: number;
    private clock = 0;
    private cooldown = 1000;
    private flash = 0;

    constructor(scene: Phaser.Scene, spawn: EnemySpawn, id: string, state?: EnemySnapshot) {
        this.id = id;
        this.definition = getEnemy(spawn.type);
        this.hp = state?.hp ?? this.definition.hp;
        this.facing = (state?.facing ?? spawn.facing) === "left" ? -1 : 1;
        const x = state?.x ?? spawn.x * GAME_SCALE;
        const y = state?.y ?? spawn.y * GAME_SCALE;
        this.anchorY = spawn.y * GAME_SCALE;
        this.left = Math.max(45, (spawn.x - 100) * GAME_SCALE);
        this.right = (spawn.x + 100) * GAME_SCALE;
        this.sprite = scene.physics.add.image(x, y, `enemy-${spawn.type}`).setOrigin(0.5, 1).setScale(5 * GAME_SCALE);
        this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
        this.body.setAllowGravity(!this.isFlying()).setCollideWorldBounds(true);
        this.bar = scene.add.graphics().setDepth(4);
    }

    public isFlying(): boolean { return this.definition.type === "rust_drone" || this.definition.type === "scout_drone"; }
    public getHealth(): number { return this.hp; }
    public setPatrolBounds(left: number, right: number): void {
        this.left = Math.max(this.left, left);
        this.right = Math.max(this.left, Math.min(this.right, right));
    }

    public update(delta: number, player: Phaser.Physics.Arcade.Body): number[][] {
        this.clock += delta;
        this.cooldown -= delta;
        this.updateVisuals(delta);
        const body = this.body;
        if (body.blocked.left || this.sprite.x <= this.left) this.facing = 1;
        if (body.blocked.right || this.sprite.x >= this.right) this.facing = -1;
        const type = this.definition.type;
        const speed = type === "shooter" ? 0 : (type === "heavy_walker" ? 35 : type === "sand_beetle" ? 65 : 45) * GAME_SCALE;
        body.setVelocityX(speed * this.facing);
        if (this.isFlying()) body.setVelocityY(Math.cos(this.clock / 600) * 30 * GAME_SCALE + (this.anchorY - this.sprite.y) * 0.5);
        this.sprite.setFlipX(this.facing < 0);
        const dx = player.center.x - body.center.x;
        const dy = player.center.y - body.center.y;
        if (this.cooldown > 0 || Math.abs(dx) > 600 * GAME_SCALE) return [];
        if (this.isFlying()) {
            if (dy < 0 || Math.abs(dx) > 180 * GAME_SCALE) return [];
            this.cooldown = 1800;
            return [[0, 300 * GAME_SCALE]];
        }
        if (Math.abs(dy) > 90 * GAME_SCALE) return [];
        this.cooldown = type === "shooter" ? 2000 : type === "sand_beetle" ? 2200 : 1700;
        this.facing = dx < 0 ? -1 : 1;
        const vx = 280 * GAME_SCALE * this.facing;
        return type === "heavy_walker" ? [[vx, -70], [vx, 0], [vx, 70]] : [[vx, type === "sand_beetle" ? -90 : 0]];
    }

    public getShotOrigin(vx: number, _vy: number): { x: number; y: number } {
        return { x: this.body.center.x + Math.sign(vx) * (this.body.halfWidth + 12),
            y: this.body.center.y + (this.isFlying() ? this.body.halfHeight + 12 : 0) };
    }

    protected updateVisuals(delta: number): void {
        this.flash = Math.max(0, this.flash - delta);
        if (!this.flash) this.sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
        const body = this.body;
        this.bar.clear();
        if (this.hp < this.definition.hp) {
            this.bar.fillStyle(0x080d17).fillRect(body.left, body.top - 15, body.width, 7);
            this.bar.fillStyle(0xd64545).fillRect(body.left, body.top - 15, body.width * this.hp / this.definition.hp, 7);
        }
    }

    public takeDamage(amount: number): void {
        this.hp = Math.max(0, this.hp - amount);
        this.flash = 100;
        this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    }

    public getSnapshot(): EnemySnapshot {
        return { id: this.id, hp: this.hp, x: this.sprite.x, y: this.sprite.y, facing: this.facing < 0 ? "left" : "right" };
    }

    public destroy(): void { this.bar.destroy(); this.sprite.destroy(); }
}
