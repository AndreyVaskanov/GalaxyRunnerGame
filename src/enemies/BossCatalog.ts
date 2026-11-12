import data from "../data/bosses.json";
import { BOSS_BALANCE as B } from "../config/BossBalance";

export type BossType = keyof typeof data.bosses;
export interface HitPoint { x: number; y: number }
export interface BossBounds { left: number; top: number; width: number; height: number }

export function golemPlayerContact(bounds: BossBounds, player: BossBounds, previousBottom: number, velocityY: number): { fromAbove: boolean } | null {
    const overlaps = B.golemCollision.rectangles.map(([x, y, w, h]) => ({
        left: bounds.left + bounds.width * x / B.golemCollision.spriteWidth, top: bounds.top + bounds.height * y / B.golemCollision.spriteHeight,
        width: bounds.width * w / B.golemCollision.spriteWidth, height: bounds.height * h / B.golemCollision.spriteHeight
    })).filter(part => player.left < part.left + part.width && player.left + player.width > part.left
        && player.top < part.top + part.height && player.top + player.height > part.top);
    if (!overlaps.length) return null;
    return { fromAbove: velocityY > 0 && overlaps.some(part => previousBottom <= part.top + B.shared.stompTopToleranceWorld) };
}

// При перекрытии край снаряда уже внутри цели, хотя его центр ещё снаружи.
export function bossContactPoint(zone: BossBounds, projectile: HitPoint): HitPoint {
    const inset = 0.001;
    return {
        x: Math.max(zone.left + inset, Math.min(zone.left + zone.width - inset, projectile.x)),
        y: Math.max(zone.top + inset, Math.min(zone.top + zone.height - inset, projectile.y))
    };
}

export function getBoss(type: string) {
    if (!Object.hasOwn(data.bosses, type)) throw new Error(`Неизвестный босс: ${type}`);
    return { type: type as BossType, ...data.bosses[type as BossType] };
}

// Правила попадания общие для снаряда и прыжка сверху.
export function acceptsBossHit(type: BossType, bounds: BossBounds, state: string, facing: number, hit: HitPoint): boolean {
    const relativeY = (hit.y - bounds.top) / bounds.height;
    const zone = B.hitZones[type];
    if (type === "sand_worm" && state !== "surface") return false;
    if (type !== "lord_varx") {
        return relativeY >= zone.top - zone.topTolerance && relativeY <= zone.top + zone.height + zone.bottomTolerance
            && (type !== "scrap_golem" || Math.abs(hit.x - bounds.left - bounds.width / 2) <= bounds.width * zone.width / 2);
    }
    if (!B.lord_varx.frontalBlock || B.lord_varx.vulnerableStates.includes(state)) return true;
    return facing > 0 ? hit.x < bounds.left + bounds.width / 2 : hit.x > bounds.left + bounds.width / 2;
}
