import type Phaser from "phaser";
import { GAME_SCALE } from "../config/GameScale";

export default class Projectile {
    public readonly sprite: Phaser.Physics.Arcade.Image;
    private readonly colliders: Phaser.Physics.Arcade.Collider[] = [];
    private readonly startX: number;
    private readonly startY: number;
    private readonly range: number;
    public alive = true;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string, vx: number, vy: number, range: number, gravity = 0) {
        this.startX = x;
        this.startY = y;
        this.range = range;
        this.sprite = scene.physics.add.image(x, y, texture).setScale(3 * GAME_SCALE).setDepth(3);
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(gravity !== 0).setGravityY(gravity - scene.physics.world.gravity.y).setVelocity(vx, vy);
        this.sprite.setFlipX(vx < 0);
    }

    public addCollider(collider: Phaser.Physics.Arcade.Collider): void { this.colliders.push(collider); }

    public update(): void {
        if (this.alive && Math.hypot(this.sprite.x - this.startX, this.sprite.y - this.startY) >= this.range) this.destroy();
    }

    public destroy(): void {
        if (!this.alive) return;
        this.alive = false;
        for (const collider of this.colliders) collider.destroy();
        this.colliders.length = 0;
        this.sprite.destroy();
    }
}
