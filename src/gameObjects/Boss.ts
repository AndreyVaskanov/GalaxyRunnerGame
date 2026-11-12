import Phaser from "phaser";
import { BOSS_BALANCE as B } from "../config/BossBalance";
import { GAME_SCALE } from "../config/GameScale";
import { acceptsBossHit, getBoss, golemPlayerContact } from "../enemies/BossCatalog";
import type { HitPoint } from "../enemies/BossCatalog";
import type { BossSnapshot } from "../interface/RunData";

export type BossAction =
    | { type: "shot"; x: number; y: number; vx: number; vy: number; gravity?: number; size?: number; color?: number }
    | { type: "hit" }
    | { type: "push"; vx: number; vy: number }
    | { type: "summon"; x: number; y: number };

export default class Boss {
    public readonly definition: ReturnType<typeof getBoss>;
    public readonly sprite: Phaser.Physics.Arcade.Image;
    public readonly body: Phaser.Physics.Arcade.Body;
    public readonly hitZone: Phaser.GameObjects.Zone;
    public readonly solidParts: Phaser.GameObjects.Zone[] = [];
    private readonly hitBody: Phaser.Physics.Arcade.StaticBody;
    private readonly graphics: Phaser.GameObjects.Graphics;
    private readonly bar: Phaser.GameObjects.Graphics;
    private readonly title: Phaser.GameObjects.Text;
    private readonly hint: Phaser.GameObjects.Text;
    private readonly contactHint: Phaser.GameObjects.Text | null;
    private readonly groundY: number;
    private readonly width: number;
    private hp: number;
    private facing = -1;
    private state = "guard";
    private timer = 0;
    private cooldown = B.shared.initialShotDelayMs;
    private burst = 0;
    private burstTimer = 0;
    private summonCooldown = B.scrap_golem.summonCooldownMs;
    private debrisCooldown: number | null = null;
    private flash = 0;
    private time = 0;
    private varxPhaseTwoAnnounced = false;
    private readonly stanceLabel: Phaser.GameObjects.Text | null;

    constructor(scene: Phaser.Scene, type: string, x: number, y: number, width: number, state?: BossSnapshot | null) {
        this.definition = getBoss(type);
        this.hp = state?.hp ?? this.definition.hp;
        this.groundY = y;
        this.width = width;
        this.sprite = scene.physics.add.image(state?.x ?? x, state?.y ?? y, `boss-${type}`)
            .setOrigin(0.5, 1).setScale(this.definition.scale * GAME_SCALE).setDepth(1);
        this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
        this.body.setAllowGravity(false).setImmovable(true);
        this.body.moves = false;
        this.hitZone = scene.add.zone(this.sprite.x, this.sprite.y, 1, 1);
        scene.physics.add.existing(this.hitZone, true);
        this.hitBody = this.hitZone.body as Phaser.Physics.Arcade.StaticBody;
        if (type === "scrap_golem") {
            for (let index = 0; index < B.golemCollision.rectangles.length; index++) {
                const part = scene.add.zone(0, 0, 1, 1);
                scene.physics.add.existing(part, true);
                this.solidParts.push(part);
            }
        }
        this.graphics = scene.add.graphics().setDepth(5);
        this.bar = scene.add.graphics().setDepth(70);
        this.title = scene.add.text(width / 2, 945, "", {
            fontFamily: "Rubik", fontSize: "27px", color: "#FFFFFF", backgroundColor: "#080D17",
            padding: { x: 14, y: 5 }
        }).setOrigin(0.5).setDepth(71);
        this.contactHint = type === "scrap_golem" ? scene.add.text(width / 2, 160,
            "Голем не наносит урон телом — пользуйтесь этим", {
                fontFamily: "Rubik", fontSize: "20px", color: "#FFFFFF", align: "center"
            }).setOrigin(0.5).setDepth(71) : null;
        this.hint = scene.add.text(width / 2, 1025, "", {
            fontFamily: "Rubik", fontSize: "23px", color: "#F2C94C", backgroundColor: "#080D17",
            padding: { x: 14, y: 6 }, align: "center", wordWrap: { width: width - 120 }
        }).setOrigin(0.5).setDepth(71);
        this.stanceLabel = type === "lord_varx" ? scene.add.text(0, 0, "", {
            fontFamily: "Rubik", fontSize: "24px", color: "#FFFFFF", backgroundColor: "#080D17",
            padding: { x: 12, y: 7 }, align: "center"
        }).setOrigin(0.5, 1).setDepth(72) : null;
        if (type === "lord_varx") this.timer = B.lord_varx.guardMs;
        if (type === "sand_worm") { this.state = "buried"; this.timer = B.sand_worm.initialBuriedMs; this.sprite.setVisible(false); this.body.enable = false; }
        if (type === "scrap_golem") { this.state = "walk"; this.timer = this.phaseTwo() ? B.scrap_golem.initialWalkPhaseTwoMs : B.scrap_golem.initialWalkPhaseOneMs; }
        this.syncHitZone();
    }

    public getHealth(): number { return this.hp; }
    public getPlayerContact(player: Phaser.Physics.Arcade.Body): { fromAbove: boolean } | null {
        const previousBottom = player.prev.y + player.height;
        if (this.definition.type === "scrap_golem") return golemPlayerContact(this.body, player, previousBottom, player.velocity.y);
        return { fromAbove: player.velocity.y > 0 && previousBottom <= this.body.top + B.shared.stompTopToleranceWorld };
    }
    private phaseTwo(): boolean { return this.hp <= this.definition.hp * B.shared.phaseTwoHpRatio; }

    public update(delta: number, player: Phaser.Physics.Arcade.Body): BossAction[] {
        this.timer -= delta;
        this.cooldown -= delta;
        this.flash = Math.max(0, this.flash - delta);
        this.time += delta;
        if (this.flash === 0) this.sprite.clearTint();
        this.graphics.clear();
        const actions: BossAction[] = [];
        if (this.definition.type === "sand_worm") this.updateWorm(player, actions);
        if (this.definition.type === "walking_tank") this.updateTank(delta, player, actions);
        if (this.definition.type === "lord_varx") this.updateVarx(delta, player, actions);
        if (this.definition.type === "scrap_golem") this.updateGolem(delta, player, actions);
        this.sprite.setFlipX(this.facing < 0);
        this.body.updateFromGameObject();
        this.syncHitZone();
        this.drawHealth();
        return actions;
    }

    private aim(player: Phaser.Physics.Arcade.Body, actions: BossAction[], speed: number, gravity: number, size: number): void {
        const x = this.body.center.x;
        const y = this.body.center.y;
        const angle = Math.atan2(player.center.y - y, player.center.x - x);
        actions.push({ type: "shot", x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            gravity, size, color: gravity ? 0xc9a36a : undefined });
    }

    private updateWorm(player: Phaser.Physics.Arcade.Body, actions: BossAction[]): void {
        const c = B.sand_worm;
        if (this.timer <= 0) {
            if (this.state === "buried") {
                this.state = "warning"; this.timer = this.phaseTwo() ? c.warningPhaseTwoMs : c.warningPhaseOneMs;
                this.sprite.setPosition(player.center.x, this.groundY);
            } else if (this.state === "warning") { this.state = "surface"; this.timer = c.surfaceMs; this.cooldown = c.firstSpitDelayMs; }
            else { this.state = "buried"; this.timer = this.phaseTwo() ? c.buriedPhaseTwoMs : c.buriedPhaseOneMs; }
        }
        const visible = this.state === "surface";
        this.sprite.setVisible(visible);
        this.body.enable = visible;
        if (this.state === "warning") {
            this.graphics.lineStyle(5, 0x754a00);
            const x = this.sprite.x;
            this.graphics.lineBetween(x - 90, this.groundY - 3, x - 35, this.groundY - 16);
            this.graphics.lineBetween(x - 35, this.groundY - 16, x + 15, this.groundY - 5);
            this.graphics.lineBetween(x + 15, this.groundY - 5, x + 90, this.groundY - 20);
        }
        if (visible && this.phaseTwo() && this.cooldown <= 0) {
            this.facing = player.center.x < this.sprite.x ? -1 : 1;
            const x = this.body.center.x + this.facing * this.body.width * c.mouthXRatio;
            const y = this.body.top + this.body.height * c.mouthYRatio;
            const flightTime = Phaser.Math.Clamp(c.flightBaseSec + Math.abs(player.center.x - x) / c.flightDistanceWorld, c.flightMinSec, c.flightMaxSec);
            const targetX = Phaser.Math.Clamp(player.center.x + Phaser.Math.Between(-c.aimSpreadPx, c.aimSpreadPx) * GAME_SCALE, c.targetEdgeMarginWorld, this.width - c.targetEdgeMarginWorld);
            const gravity = c.gravity * GAME_SCALE;
            const vx = (targetX - x) / flightTime;
            const vy = (player.center.y - y - gravity * flightTime * flightTime / 2) / flightTime;
            const speed = Math.hypot(vx, vy);
            const slowdown = speed > 0 ? Math.max(c.minimumSpeedWorld, speed - c.speedReduction * GAME_SCALE) / speed * c.speedMultiplier : 1;
            // Та же дуга при меньшей скорости: масштабируем и ускорение падения.
            actions.push({ type: "shot", x, y, vx: vx * slowdown, vy: vy * slowdown,
                gravity: gravity * slowdown * slowdown, size: c.projectileSizeWorld, color: 0xc9a36a });
            this.cooldown = c.spitCooldownMs;
        }
        this.hint.setText(visible ? "Уязвима голова — прыгайте и стреляйте выше" : "Трещины показывают место появления — отойдите");
    }

    private updateTank(delta: number, player: Phaser.Physics.Arcade.Body, actions: BossAction[]): void {
        const c = B.walking_tank;
        this.facing = player.center.x < this.sprite.x ? -1 : 1;
        this.sprite.setScale(this.definition.scale * GAME_SCALE, this.definition.scale * GAME_SCALE * (this.phaseTwo() ? c.phaseTwoHeightRatio : 1));
        if (this.phaseTwo()) {
            if (this.cooldown <= 0) {
                if (Phaser.Math.Between(0, 99) < c.lowRocketChance * 100) {
                    // Нижний ствол выпускает ракету под платформами.
                    const x = this.body.center.x + this.facing * (this.body.halfWidth + c.lowMuzzleOffsetWorld);
                    const y = this.groundY - c.lowRocketHeightWorld;
                    const angle = Math.atan2(Math.max(player.center.y, y + c.lowTargetDropWorld) - y, player.center.x - x);
                    actions.push({ type: "shot", x, y, vx: Math.cos(angle) * c.lowRocketSpeed * GAME_SCALE,
                        vy: Math.sin(angle) * c.lowRocketSpeed * GAME_SCALE, color: 0xffa84c, size: c.rocketSizeWorld });
                } else {
                    const vy = c.upperLaunchSpeedY * GAME_SCALE;
                    const gravity = c.upperGravity * GAME_SCALE;
                    const flightTime = (-vy + Math.sqrt(vy * vy + 2 * gravity * Math.max(0, player.center.y - this.body.top))) / gravity;
                    const targetX = Phaser.Math.Clamp(player.center.x + player.velocity.x * c.predictionSec, c.targetEdgeMarginWorld, this.width - c.targetEdgeMarginWorld);
                    actions.push({ type: "shot", x: this.body.center.x, y: this.body.top,
                        vx: (targetX - this.body.center.x) / flightTime * c.upperSpeedMultiplier, vy: vy * c.upperSpeedMultiplier,
                        gravity: gravity * c.upperSpeedMultiplier ** 2, color: 0xffa84c, size: c.rocketSizeWorld });
                }
                this.cooldown = c.rocketCooldownMs;
            }
        } else {
            this.burstTimer -= delta;
            if (this.cooldown <= 0 && this.burst === 0) { this.burst = c.burstCount; this.burstTimer = 0; this.cooldown = c.burstCooldownMs; }
            if (this.burst > 0 && this.burstTimer <= 0) {
                const x = this.body.center.x + this.facing * (this.body.halfWidth + c.muzzleOffsetWorld);
                const y = this.groundY - c.bulletHeightWorld;
                const angle = Math.atan2(player.center.y - y, player.center.x - x);
                actions.push({ type: "shot", x, y, vx: Math.cos(angle) * c.bulletSpeed * GAME_SCALE, vy: Math.sin(angle) * c.bulletSpeed * GAME_SCALE });
                this.burst--; this.burstTimer = c.bulletIntervalMs;
            }
        }
        this.hint.setText(this.phaseTwo() ? "Танк сел на корпус — уклоняйтесь от ракет, цельтесь в нижнюю часть" : `Стреляйте в ноги. Выстрелов в очереди: ${c.burstCount}`);
    }

    private updateVarx(delta: number, player: Phaser.Physics.Arcade.Body, actions: BossAction[]): void {
        const c = B.lord_varx;
        const dx = player.center.x - this.sprite.x;
        if (this.phaseTwo() && !this.varxPhaseTwoAnnounced) {
            this.varxPhaseTwoAnnounced = true;
            this.state = "phaseChange";
            this.timer = c.phaseChangeMs;
        }
        if (this.state === "guard") {
            this.facing = dx < 0 ? -1 : 1;
            if (Math.abs(dx) > c.approachDistanceWorld) this.sprite.x += Math.sign(dx) * c.movementSpeed * GAME_SCALE * delta / 1000;
        }
        if (this.timer <= 0) {
            if (this.state === "guard") { this.state = "windup"; this.timer = c.windupMs; }
            else if (this.state === "windup") {
                this.state = "strike"; this.timer = c.strikeMs;
                if (Math.abs(dx) < c.strikeDistanceWorld && Math.abs(player.center.y - this.body.center.y) < c.strikeVerticalDistanceWorld) actions.push({ type: "hit" });
                if (this.phaseTwo() && Math.abs(dx) < c.pushDistanceWorld) actions.push({ type: "push", vx: Math.sign(dx || this.facing) * c.pushVelocityXWorld, vy: c.pushVelocityYWorld });
            } else if (this.state === "strike") { this.state = "recovery"; this.timer = c.recoveryMs; }
            else { this.state = "guard"; this.timer = c.guardMs; }
        }
        if (this.state === "windup" || this.state === "strike") {
            this.graphics.fillStyle(this.state === "strike" ? 0xd64545 : 0xf2c94c, 0.25);
            this.graphics.fillRect(this.sprite.x + (this.facing < 0 ? -c.strikeDistanceWorld : 0),
                this.body.top, c.strikeDistanceWorld, this.groundY - this.body.top);
        }
        this.sprite.x = Phaser.Math.Clamp(this.sprite.x, this.body.halfWidth, this.width - this.body.halfWidth);
        const cues: Record<string, { label: string; hint: string; color: number }> = {
            guard: { label: "БЛОК", hint: "Дождитесь замаха — тогда Варкс откроется для атаки", color: 0x5fd3ff },
            windup: { label: "ЗАМАХ · АТАКУЙТЕ", hint: "Варкс открыт, но скоро ударит — атакуйте и выйдите из жёлтой зоны", color: 0xf2c94c },
            strike: { label: this.phaseTwo() ? "УДАР И ТОЛЧОК" : "УДАР", hint: "Уклоняйтесь от удара", color: 0xff7777 },
            recovery: { label: "ОТКРЫТ · АТАКУЙТЕ", hint: "Варкс восстанавливается — сейчас безопасное окно для атаки", color: 0x5af6b8 },
            phaseChange: { label: "ФАЗА II · ТОЛЧОК СИЛЫ", hint: "Теперь каждый замах завершается ударом и отталкиванием — держите дистанцию", color: 0xbf90ff }
        };
        const cue = cues[this.state]!;
        this.hint.setText(cue.hint).setColor(`#${cue.color.toString(16).padStart(6, "0")}`);
        this.stanceLabel?.setPosition(this.sprite.x, this.body.top - 20).setText(cue.label)
            .setColor(`#${cue.color.toString(16).padStart(6, "0")}`);
        this.graphics.lineStyle(3, cue.color, 0.8).strokeRect(this.body.left - 6, this.body.top - 6, this.body.width + 12, this.body.height + 12);
        if (this.state === "windup") {
            this.graphics.fillStyle(0xf2c94c, 0.9).fillRect(this.body.left, this.body.top - 12,
                this.body.width * Math.max(0, this.timer / c.windupMs), 5);
        }
        this.drawVarxAttack();
    }

    private drawVarxAttack(): void {
        const c = B.lord_varx;
        const pivotX = this.sprite.x + this.facing * this.body.width * 0.25;
        const pivotY = this.body.top + this.body.height * 0.42;
        let angle = -0.9;
        if (this.state === "windup") angle = -0.9 - (1 - this.timer / c.windupMs) * 1.5;
        if (this.state === "strike") angle = -2.4 + Phaser.Math.Clamp((c.strikeMs - this.timer) / c.swingAnimationMs, 0, 1) * 3.3;
        if (this.state === "recovery") angle = 0.9 - (1 - this.timer / c.recoveryMs) * 1.8;
        const length = this.state === "strike" ? 230 : 170;
        const tipX = pivotX + this.facing * Math.cos(angle) * length;
        const tipY = pivotY + Math.sin(angle) * length;
        const color = this.phaseTwo() ? 0xbf90ff : 0xff7777;
        this.graphics.lineStyle(18, color, 0.2).lineBetween(pivotX, pivotY, tipX, tipY);
        this.graphics.lineStyle(7, color, 1).lineBetween(pivotX, pivotY, tipX, tipY);
        this.graphics.lineStyle(2, 0xffffff, 1).lineBetween(pivotX, pivotY, tipX, tipY);
        if (this.state === "strike") {
            this.graphics.lineStyle(12, color, 0.35).beginPath();
            for (let step = 0; step <= 12; step++) {
                const trailAngle = angle - step * 0.065;
                const x = pivotX + this.facing * Math.cos(trailAngle) * length;
                const y = pivotY + Math.sin(trailAngle) * length;
                if (step === 0) this.graphics.moveTo(x, y); else this.graphics.lineTo(x, y);
            }
            this.graphics.strokePath();
            if (this.phaseTwo()) {
                const progress = 1 - this.timer / c.strikeMs;
                this.graphics.lineStyle(7, 0xbf90ff, (1 - progress) * 0.8)
                    .strokeCircle(this.sprite.x, this.body.center.y, 60 + progress * 700);
            }
        }
    }

    private updateGolem(delta: number, player: Phaser.Physics.Arcade.Body, actions: BossAction[]): void {
        const c = B.scrap_golem;
        const dx = player.center.x - this.sprite.x;
        this.facing = dx < 0 ? -1 : 1;
        if (this.state === "walk" && Math.abs(dx) > c.approachDistanceWorld) this.sprite.x += this.facing * c.movementSpeed * GAME_SCALE * delta / 1000;
        this.sprite.x = Phaser.Math.Clamp(this.sprite.x, this.body.halfWidth, this.width - this.body.halfWidth);
        if (this.timer <= 0) {
            if (this.state === "walk") { this.state = "windup"; this.timer = this.phaseTwo() ? c.windupPhaseTwoMs : c.windupPhaseOneMs; }
            else {
                this.state = "walk"; this.timer = this.phaseTwo() ? c.walkPhaseTwoMs : c.walkPhaseOneMs;
                for (const direction of c.waveDirections) actions.push({ type: "shot", x: this.sprite.x + direction * (this.body.halfWidth + c.waveMuzzleOffsetWorld),
                    y: this.groundY - c.waveHeightWorld, vx: direction * (this.phaseTwo() ? c.waveSpeedPhaseTwo : c.waveSpeedPhaseOne) * GAME_SCALE, vy: 0, size: c.waveSizeWorld, color: 0xffa84c });
            }
        }
        if (this.phaseTwo()) {
            if (this.debrisCooldown === null) this.debrisCooldown = c.initialWalkPhaseTwoMs;
            else this.debrisCooldown -= delta;
            if (this.debrisCooldown <= 0) {
                this.aim(player, actions, c.debrisSpeed * GAME_SCALE, c.debrisGravity * GAME_SCALE, c.debrisSizeWorld);
                this.debrisCooldown = c.debrisCooldownMs;
            }
            this.summonCooldown -= delta;
            if (this.summonCooldown <= 0) {
                for (let index = 0; index < c.summonsPerCycle; index++) {
                    actions.push({ type: "summon", x: this.sprite.x + this.facing * c.summonOffsetXWorld, y: this.groundY - c.summonHeightWorld });
                }
                this.summonCooldown = c.summonCooldownMs;
            }
        }
        if (this.state === "windup") this.graphics.lineStyle(6, 0xd64545, 0.8).lineBetween(0, this.groundY - 3, this.width, this.groundY - 3);
        this.hint.setText(this.state === "windup"
            ? "Голем готовит удар по земле — прыгайте!"
            : "Цельтесь в светящееся ядро в груди.");
    }

    private syncHitZone(): void {
        this.body.updateFromGameObject();
        this.solidParts.forEach((part, index) => {
            const [x, y, w, h] = B.golemCollision.rectangles[index]!;
            const grid = B.golemCollision;
            const width = this.body.width * w / grid.spriteWidth;
            const height = this.body.height * h / grid.spriteHeight;
            part.setPosition(this.body.left + this.body.width * x / grid.spriteWidth + width / 2,
                this.body.top + this.body.height * y / grid.spriteHeight + height / 2).setSize(width, height);
            const body = part.body as Phaser.Physics.Arcade.StaticBody;
            body.updateFromGameObject();
            body.enable = this.body.enable;
        });
        const zone = B.hitZones[this.definition.type];
        const top = this.body.top + this.body.height * zone.top;
        const height = this.body.height * zone.height;
        const width = this.body.width * zone.width;
        this.hitZone.setPosition(this.body.center.x, top + height / 2).setSize(width, height);
        this.hitBody.setSize(width, height).updateFromGameObject();
        this.hitBody.enable = this.body.enable;
        if (this.sprite.visible && this.definition.type !== "lord_varx") {
            this.graphics.lineStyle(2, 0x5af6b8, 0.7).strokeRect(this.body.center.x - width / 2, top, width, height);
            if (this.definition.type === "scrap_golem") this.graphics.fillStyle(0x5af6b8, 0.4 + Math.sin(this.time / 150) * 0.15)
                .fillEllipse(this.body.center.x, top + height / 2, 40, 56);
        }
    }

    private drawHealth(): void {
        this.bar.clear().fillStyle(0x080d17, 0.9).fillRoundedRect(this.width / 2 - 380, 968, 760, 30, 8);
        this.bar.fillStyle(this.phaseTwo() ? 0xd64545 : 0xf2c94c).fillRect(this.width / 2 - 370, 978, 740 * this.hp / this.definition.hp, 10);
        this.title.setText(`${this.definition.name} · ${this.hp} / ${this.definition.hp}${this.phaseTwo() ? " · Фаза II" : ""}`);
    }

    public takeDamage(amount: number, hit: HitPoint): boolean {
        if (!this.body.enable || !acceptsBossHit(this.definition.type, this.body, this.state, this.facing, hit)) return false;
        this.hp = Math.max(0, this.hp - amount);
        this.flash = 120;
        this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
        return true;
    }

    public getSnapshot(): BossSnapshot { return { type: this.definition.type, hp: this.hp, x: this.sprite.x, y: this.sprite.y }; }
    public playDefeat(): void {
        const scene = this.sprite.scene;
        const ghost = scene.add.image(this.sprite.x, this.sprite.y, this.sprite.texture.key)
            .setOrigin(0.5, 1).setScale(this.sprite.scaleX, this.sprite.scaleY).setFlipX(this.sprite.flipX)
            .setTint(0xffffff).setTintMode(Phaser.TintModes.FILL).setDepth(6);
        scene.tweens.add({ targets: ghost, alpha: 0, y: ghost.y - 35, duration: 700,
            onComplete: () => ghost.destroy() });
    }
    public destroy(): void {
        this.stanceLabel?.destroy();
        this.contactHint?.destroy();
        for (const part of this.solidParts) part.destroy();
        this.hitZone.destroy(); this.sprite.destroy(); this.graphics.destroy(); this.bar.destroy(); this.title.destroy(); this.hint.destroy();
    }
}
