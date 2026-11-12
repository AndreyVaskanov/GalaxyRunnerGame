import type Phaser from "phaser";
import Enemy from "./Enemy";
import { BOSS_BALANCE } from "../config/BossBalance";
import { GAME_SCALE } from "../config/GameScale";

/** Отдельный призванный юнит: характеристики/спрайт обычного дрона, преследование героя вместо патруля. */
export default class GolemDrone extends Enemy {
    private attackCooldown = BOSS_BALANCE.scrap_golem.droneFirstShotMs;

    public override isFlying(): boolean { return true; }

    public override update(delta: number, player: Phaser.Physics.Arcade.Body): number[][] {
        this.updateVisuals(delta);
        this.attackCooldown = Math.max(0, this.attackCooldown - delta);
        const c = BOSS_BALANCE.scrap_golem;
        const dx = player.center.x - this.body.center.x;
        const targetY = player.center.y - c.droneHeightAbovePlayerPx * GAME_SCALE;
        const dy = targetY - this.body.center.y;
        const speedX = Math.min(c.droneMoveSpeed * GAME_SCALE,
            Math.max(0, Math.abs(dx) - c.droneStopDistancePx * GAME_SCALE) * c.droneTrackingGain);
        const speedY = Math.max(-c.droneVerticalSpeed * GAME_SCALE,
            Math.min(c.droneVerticalSpeed * GAME_SCALE, dy * c.droneTrackingGain));
        this.body.setVelocity(speedX * Math.sign(dx), speedY);
        if (dx !== 0) this.sprite.setFlipX(dx < 0);
        const aimY = player.center.y - this.body.center.y;
        if (this.attackCooldown > 0 || Math.abs(dx) > c.droneAttackRangePx * GAME_SCALE
            || Math.abs(aimY) > c.droneAttackHeightPx * GAME_SCALE) return [];
        this.attackCooldown = c.droneShotCooldownMs;
        const angle = Math.atan2(aimY, dx);
        return [[Math.cos(angle) * c.droneShotSpeed * GAME_SCALE, Math.sin(angle) * c.droneShotSpeed * GAME_SCALE]];
    }

    public override getShotOrigin(vx: number, vy: number): { x: number; y: number } {
        const angle = Math.atan2(vy, vx);
        const offset = Math.hypot(this.body.halfWidth, this.body.halfHeight)
            + BOSS_BALANCE.scrap_golem.droneMuzzleOffsetWorld;
        return { x: this.body.center.x + Math.cos(angle) * offset, y: this.body.center.y + Math.sin(angle) * offset };
    }
}
