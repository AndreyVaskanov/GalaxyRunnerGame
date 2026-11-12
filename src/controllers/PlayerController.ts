import Phaser from "phaser";
import { BOSS_BALANCE } from "../config/BossBalance";
import type { ControlBinding } from "../config/Controls";
import type { HitPoint } from "../enemies/BossCatalog";
import Hero from "../gameObjects/Hero";
import type SettingsManager from "../managers/SettingsManager";
import type EnemyManager from "../managers/EnemyManager";
import type { ManagedEnemy } from "../managers/EnemyManager";
import type { HeroDefinition } from "../interface/HeroDefinition";
import { getHeroMovement, getJumpVelocity } from "../characters/CharacterCatalog";
import rules from "../data/rules.json";
import heroes from "../data/heroes.json";
import Projectile from "../gameObjects/Projectile";
import { GAME_SCALE } from "../config/GameScale";

export default class PlayerController {
    private readonly scene: Phaser.Scene;
    private readonly settings: SettingsManager;
    private readonly enemies: EnemyManager;
    private readonly character: HeroDefinition;
    private hero: Hero | null = null;
    private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
    private health = rules.lives;
    private active = true;
    private shots: Projectile[] = [];
    private cooldown = 0;
    private invulnerability = 0;
    private hitFlash = 0;
    private damageFlag = false;
    private knockback = 0;
    private readonly pointerAttack: (pointer: Phaser.Input.Pointer) => void;

    constructor(scene: Phaser.Scene, settings: SettingsManager, enemies: EnemyManager, character: HeroDefinition) {
        this.scene = scene;
        this.settings = settings;
        this.enemies = enemies;
        this.character = { ...character };
        this.pointerAttack = pointer => {
            if (!this.active || !this.hero || !pointer.leftButtonDown() || pointer.worldY <= 90) return;
            const keys = this.settings.getSettings().keys;
            if ([keys.attack, keys.attackAlternative].includes("MOUSE_LEFT")) this.fire();
            if ([keys.jump, keys.jumpAlternative].includes("MOUSE_LEFT")) this.jump();
        };
        this.scene.input.on("pointerdown", this.pointerAttack);
    }

    public spawn(x: number, y: number, health = rules.lives): void {
        for (const shot of this.shots) shot.destroy();
        this.shots = [];
        this.hero?.destroy();
        this.hero = new Hero(this.scene, x, y, this.character.id);
        this.health = health;
        this.active = true;
        this.cooldown = 0;
        this.knockback = 0;
        this.invulnerability = 500;
        this.hitFlash = 0;
        this.damageFlag = false;
        const bindings = this.settings.getSettings().keys;
        this.keys = this.scene.input.keyboard!.addKeys(Object.fromEntries(
            Object.entries(bindings).filter(([binding, value]) => !binding.startsWith("pause") && value && value !== "MOUSE_LEFT")
        )) as Record<string, Phaser.Input.Keyboard.Key>;
        this.scene.input.keyboard!.resetKeys();
    }

    public getBody(): Phaser.Physics.Arcade.Body {
        if (!this.hero) throw new Error("Персонаж ещё не создан");
        return this.hero.getBody();
    }

    public getHealth(): number { return this.health; }
    public getCharacterId(): string { return this.character.id; }
    public moveTo(x: number, y: number): void { this.getBody().reset(x, y); }
    public setActive(active: boolean): void { this.active = active; }

    // Сюда будут передаваться подтверждённые попадания, а не нажатия клавиши атаки.
    public hitEnemy(enemy: ManagedEnemy, stomp = false, hit?: HitPoint): void {
        if (this.active) this.enemies.damageEnemy(enemy, stomp ? 1 : this.character.damage, hit);
    }

    public stompEnemy(enemy: ManagedEnemy): void {
        if (!this.active) return;
        this.hitEnemy(enemy, true, { x: this.getBody().center.x, y: this.getBody().bottom });
        this.getBody().setVelocityY(-420 * GAME_SCALE);
        this.invulnerability = Math.max(this.invulnerability, 200);
    }

    public consumeDamageFlag(): boolean { const damaged = this.damageFlag; this.damageFlag = false; return damaged; }

    private fire(): void {
        if (!this.active || !this.hero || this.cooldown > 0) return;
        this.cooldown = 250;
        const body = this.getBody();
        const facing = this.hero.getFacing();
        const shot = new Projectile(this.scene, body.center.x + facing * (body.halfWidth + 12), body.center.y,
            "playerBullet", heroes.rules.blaster.speedPxPerSec * GAME_SCALE * facing, 0, heroes.rules.blaster.rangePx * GAME_SCALE);
        this.shots.push(shot);
        this.enemies.registerPlayerShot(shot, (enemy, hit) => this.hitEnemy(enemy, false, hit));
    }

    public push(vx: number, vy: number): void {
        if (!this.active) return;
        this.getBody().setVelocity(vx, vy);
        this.knockback = BOSS_BALANCE.lord_varx.knockbackControlLockMs;
    }

    public takeDamage(amount: number): void {
        if (this.active && this.invulnerability <= 0 && Number.isFinite(amount) && amount > 0) {
            this.health = Math.max(0, this.health - amount);
            this.invulnerability = 1000;
            this.hitFlash = 360;
            this.hero?.setHitFlash(true);
            this.damageFlag = true;
        }
    }

    public update(delta: number): void {
        if (!this.active || !this.hero) return;
        this.cooldown = Math.max(0, this.cooldown - delta);
        this.invulnerability = Math.max(0, this.invulnerability - delta);
        this.hero.setInvulnerable(this.invulnerability > 0);
        this.hitFlash = Math.max(0, this.hitFlash - delta);
        this.hero.setHitFlash(this.hitFlash > 0 && Math.floor((360 - this.hitFlash) / 60) % 2 === 0);
        for (const shot of this.shots) shot.update();
        this.shots = this.shots.filter(shot => shot.alive);
        const attack = this.keys.attack && Phaser.Input.Keyboard.JustDown(this.keys.attack);
        const alternativeAttack = this.keys.attackAlternative && Phaser.Input.Keyboard.JustDown(this.keys.attackAlternative);
        if (attack || alternativeAttack) this.fire();
        const movement = getHeroMovement(this.character);
        const right = this.isDown("right") || this.isDown("rightAlternative");
        const left = this.isDown("left") || this.isDown("leftAlternative");
        const speed = (Number(right) - Number(left)) * movement.speed;
        this.knockback = Math.max(0, this.knockback - delta);
        if (this.knockback === 0) this.hero.setSpeedX(speed);
        const jump = this.keys.jump && Phaser.Input.Keyboard.JustDown(this.keys.jump);
        const alternativeJump = this.keys.jumpAlternative && Phaser.Input.Keyboard.JustDown(this.keys.jumpAlternative);
        if (jump || alternativeJump) this.jump();
        this.hero.updateAnimation();
    }

    private isDown(binding: ControlBinding): boolean {
        if (this.settings.getSettings().keys[binding] === "MOUSE_LEFT") {
            const pointer = this.scene.input.activePointer;
            return pointer.worldY > 90 && pointer.leftButtonDown();
        }
        return this.keys[binding]?.isDown ?? false;
    }

    private jump(): void {
        if (!this.active || !this.hero) return;
        const body = this.hero.getBody();
        const movement = getHeroMovement(this.character);
        this.hero.jump(getJumpVelocity(movement.jumpHeight, body.world.gravity.y + body.gravity.y));
    }

    public destroy(): void {
        this.scene.input.off("pointerdown", this.pointerAttack);
        for (const shot of this.shots) shot.destroy();
        this.shots = [];
        this.hero?.destroy();
        this.hero = null;
    }
}
