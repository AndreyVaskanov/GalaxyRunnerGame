import data from "../data/bosses.json";

export type BossType = keyof typeof data.bosses;
export interface HitPoint { x: number; y: number }
export interface BossBounds { left: number; top: number; width: number; height: number }

// Непрозрачные участки спрайта голема 20×16: голова, плечи, руки и ноги.
const golemSilhouette = [
    [6, 0, 8, 1], [5, 1, 10, 4], [2, 5, 16, 1], [1, 6, 18, 1], [0, 7, 20, 3],
    [0, 10, 3, 2], [4, 10, 12, 2], [17, 10, 3, 2],
    [4, 12, 5, 1], [11, 12, 5, 1], [4, 13, 4, 2], [12, 13, 4, 2],
    [3, 15, 5, 1], [12, 15, 5, 1]
] as const;

export function golemPlayerContact(bounds: BossBounds, player: BossBounds, previousBottom: number, velocityY: number): { fromAbove: boolean } | null {
    const overlaps = golemSilhouette.map(([x, y, w, h]) => ({
        left: bounds.left + bounds.width * x / 20, top: bounds.top + bounds.height * y / 16,
        width: bounds.width * w / 20, height: bounds.height * h / 16
    })).filter(part => player.left < part.left + part.width && player.left + player.width > part.left
        && player.top < part.top + part.height && player.top + player.height > part.top);
    if (!overlaps.length) return null;
    return { fromAbove: velocityY > 0 && overlaps.some(part => previousBottom <= part.top + 18) };
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
    if (type === "sand_worm") return state === "surface" && relativeY >= -0.1 && relativeY <= 0.42;
    if (type === "walking_tank") return relativeY >= 0.6 && relativeY <= 1.1;
    if (type === "scrap_golem") return Math.abs(hit.x - bounds.left - bounds.width / 2) <= bounds.width * 0.22
        && relativeY >= 0.32 && relativeY <= 0.74;
    if (state === "windup" || state === "recovery") return true;
    return facing > 0 ? hit.x < bounds.left + bounds.width / 2 : hit.x > bounds.left + bounds.width / 2;
}
