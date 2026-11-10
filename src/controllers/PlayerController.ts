import Phaser from "phaser";
import Hero from "../gameObjects/Hero";
import type SettingsManager from "../managers/SettingsManager";
import type EnemyManager from "../managers/EnemyManager";
import type { ManagedEnemy } from "../managers/EnemyManager";
import type { HeroDefinition } from "../interface/HeroDefinition";
import { getHeroMovement, getJumpVelocity } from "../characters/CharacterCatalog";
import rules from "../data/rules.json";

export default class PlayerController {
    private readonly scene: Phaser.Scene;
    private readonly settings: SettingsManager;
    private readonly enemies: EnemyManager;
    private readonly character: HeroDefinition;
    private hero: Hero | null = null;
    private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
    private health = rules.lives;
    private active = true;

    constructor(scene: Phaser.Scene, settings: SettingsManager, enemies: EnemyManager, character: HeroDefinition) {
        this.scene = scene;
        this.settings = settings;
        this.enemies = enemies;
        this.character = { ...character };
    }

    public spawn(x: number, y: number): void {
        this.hero?.destroy();
        this.hero = new Hero(this.scene, x, y, this.character.id);
        this.health = rules.lives;
        this.active = true;
        const bindings = this.settings.getSettings().keys;
        this.keys = this.scene.input.keyboard!.addKeys({
            left: bindings.left, right: bindings.right,
            leftAlternative: "LEFT", rightAlternative: "RIGHT",
            jump: bindings.jump, jumpAlternative: bindings.jumpAlternative
        }) as Record<string, Phaser.Input.Keyboard.Key>;
        this.scene.input.keyboard!.resetKeys();
    }

    public getBody(): Phaser.Physics.Arcade.Body {
        if (!this.hero) throw new Error("Персонаж ещё не создан");
        return this.hero.getBody();
    }

    public getHealth(): number { return this.health; }
    public moveTo(x: number, y: number): void { this.getBody().reset(x, y); }
    public setActive(active: boolean): void { this.active = active; }

    // Сюда будут передаваться подтверждённые попадания, а не нажатия клавиши атаки.
    public hitEnemy(enemy: ManagedEnemy): void {
        if (this.active) this.enemies.damageEnemy(enemy, this.character.damage);
    }

    public takeDamage(amount: number): void {
        if (this.active && Number.isFinite(amount) && amount > 0) {
            this.health = Math.max(0, this.health - amount);
        }
    }

    public update(): void {
        if (!this.active || !this.hero) return;
        const movement = getHeroMovement(this.character);
        const right = this.keys.right.isDown || this.keys.rightAlternative.isDown;
        const left = this.keys.left.isDown || this.keys.leftAlternative.isDown;
        const speed = (Number(right) - Number(left)) * movement.speed;
        this.hero.setSpeedX(speed);
        if (Phaser.Input.Keyboard.JustDown(this.keys.jump)
            || Phaser.Input.Keyboard.JustDown(this.keys.jumpAlternative)) {
            const body = this.hero.getBody();
            this.hero.jump(getJumpVelocity(movement.jumpHeight, body.world.gravity.y + body.gravity.y));
        }
        this.hero.updateAnimation();
    }

    public destroy(): void {
        this.hero?.destroy();
        this.hero = null;
    }
}
