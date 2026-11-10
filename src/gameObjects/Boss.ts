import Phaser from "phaser";
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
    private readonly hitBody: Phaser.Physics.Arcade.StaticBody;
    private readonly graphics: Phaser.GameObjects.Graphics;
    private readonly bar: Phaser.GameObjects.Graphics;
    private readonly title: Phaser.GameObjects.Text;
    private readonly hint: Phaser.GameObjects.Text;
    private readonly groundY: number;
    private readonly width: number;
    private hp: number;
    private facing = -1;
    private state = "guard";
    private timer = 1400;
    private cooldown = 1000;
    private burst = 0;
    private burstTimer = 0;
    private summonCooldown = 6000;
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
        this.graphics = scene.add.graphics().setDepth(5);
        this.bar = scene.add.graphics().setDepth(70);
        this.title = scene.add.text(width / 2, 945, "", {
            fontFamily: "Rubik", fontSize: "27px", color: "#FFFFFF", backgroundColor: "#080D17",
            padding: { x: 14, y: 5 }
        }).setOrigin(0.5).setDepth(71);
        this.hint = scene.add.text(width / 2, 1025, "", {
            fontFamily: "Rubik", fontSize: "23px", color: "#F2C94C", backgroundColor: "#080D17",
            padding: { x: 14, y: 6 }, align: "center", wordWrap: { width: width - 120 }
        }).setOrigin(0.5).setDepth(71);
        this.stanceLabel = type === "lord_varx" ? scene.add.text(0, 0, "", {
            fontFamily: "Rubik", fontSize: "24px", color: "#FFFFFF", backgroundColor: "#080D17",
            padding: { x: 12, y: 7 }, align: "center"
        }).setOrigin(0.5, 1).setDepth(72) : null;
        if (type === "lord_varx") this.timer = 2600;
        if (type === "sand_worm") { this.state = "buried"; this.timer = 700; this.sprite.setVisible(false); this.body.enable = false; }
        if (type === "scrap_golem") { this.state = "walk"; this.timer = 2200 / 0.7 * 0.5 * (this.phaseTwo() ? 1 : 1.2); }
        this.syncHitZone();
    }

    public getHealth(): number { return this.hp; }
    public getPlayerContact(player: Phaser.Physics.Arcade.Body): { fromAbove: boolean } | null {
        const previousBottom = player.prev.y + player.height;
        if (this.definition.type === "scrap_golem") return golemPlayerContact(this.body, player, previousBottom, player.velocity.y);
        return { fromAbove: player.velocity.y > 0 && previousBottom <= this.body.top + 18 };
    }
    private phaseTwo(): boolean { return this.hp <= this.definition.hp / 2; }

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

    private aim(player: Phaser.Physics.Arcade.Body, actions: BossAction[], speed: number, gravity = 0): void {
        const x = this.body.center.x;
        const y = this.body.center.y;
        const angle = Math.atan2(player.center.y - y, player.center.x - x);
        actions.push({ type: "shot", x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            gravity, size: gravity ? 28 : undefined, color: gravity ? 0xc9a36a : undefined });
    }

    private updateWorm(player: Phaser.Physics.Arcade.Body, actions: BossAction[]): void {
        if (this.timer <= 0) {
            if (this.state === "buried") {
                this.state = "warning"; this.timer = this.phaseTwo() ? 1467 : 1100;
                this.sprite.setPosition(player.center.x, this.groundY);
            } else if (this.state === "warning") { this.state = "surface"; this.timer = 3000; this.cooldown = 625; }
            else { this.state = "buried"; this.timer = this.phaseTwo() ? 960 : 800; }
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
            const x = this.body.center.x + this.facing * this.body.width * 0.28;
            const y = this.body.top + this.body.height * 0.25;
            const flightTime = Phaser.Math.Clamp(0.8 + Math.abs(player.center.x - x) / 1200, 0.8, 1.3);
            const targetX = Phaser.Math.Clamp(player.center.x + Phaser.Math.Between(-30, 30) * GAME_SCALE, 30, this.width - 30);
            const gravity = 550 * GAME_SCALE;
            const vx = (targetX - x) / flightTime;
            const vy = (player.center.y - y - gravity * flightTime * flightTime / 2) / flightTime;
            const speed = Math.hypot(vx, vy);
            const slowdown = speed > 0 ? Math.max(1, speed - 50 * GAME_SCALE) / speed * 0.8 : 1;
            // Та же дуга при меньшей скорости: масштабируем и ускорение падения.
            actions.push({ type: "shot", x, y, vx: vx * slowdown, vy: vy * slowdown,
                gravity: gravity * slowdown * slowdown, size: 28, color: 0xc9a36a });
            this.cooldown = 1500;
        }
        this.hint.setText(visible ? "Уязвима голова — прыгайте и стреляйте выше" : "Трещины показывают место появления — отойдите");
    }

    private updateTank(delta: number, player: Phaser.Physics.Arcade.Body, actions: BossAction[]): void {
        this.facing = player.center.x < this.sprite.x ? -1 : 1;
        this.sprite.setScale(this.definition.scale * GAME_SCALE, this.definition.scale * GAME_SCALE * (this.phaseTwo() ? 0.65 : 1));
        if (this.phaseTwo()) {
            if (this.cooldown <= 0) {
                if (Phaser.Math.Between(0, 99) < 45) {
                    // Нижний ствол выпускает ракету под платформами.
                    const x = this.body.center.x + this.facing * (this.body.halfWidth + 16);
                    const y = this.groundY - 100;
                    const angle = Math.atan2(Math.max(player.center.y, y + 35) - y, player.center.x - x);
                    actions.push({ type: "shot", x, y, vx: Math.cos(angle) * 315 * GAME_SCALE,
                        vy: Math.sin(angle) * 315 * GAME_SCALE, color: 0xffa84c, size: 24 });
                } else {
                    const vy = -650 * GAME_SCALE;
                    const gravity = 900 * GAME_SCALE;
                    const flightTime = (-vy + Math.sqrt(vy * vy + 2 * gravity * Math.max(0, player.center.y - this.body.top))) / gravity;
                    const targetX = Phaser.Math.Clamp(player.center.x + player.velocity.x * 0.35, 40, this.width - 40);
                    actions.push({ type: "shot", x: this.body.center.x, y: this.body.top,
                        vx: (targetX - this.body.center.x) / flightTime * 0.7, vy: vy * 0.7,
                        gravity: gravity * 0.49, color: 0xffa84c, size: 24 });
                }
                this.cooldown = 1625;
            }
        } else {
            this.burstTimer -= delta;
            if (this.cooldown <= 0 && this.burst === 0) { this.burst = 3; this.burstTimer = 0; this.cooldown = 2750; }
            if (this.burst > 0 && this.burstTimer <= 0) {
                const x = this.body.center.x + this.facing * (this.body.halfWidth + 12);
                const y = this.groundY - 75;
                const angle = Math.atan2(player.center.y - y, player.center.x - x);
                actions.push({ type: "shot", x, y, vx: Math.cos(angle) * 440 * GAME_SCALE, vy: Math.sin(angle) * 440 * GAME_SCALE });
                this.burst--; this.burstTimer = 337.5;
            }
        }
        this.hint.setText(this.phaseTwo() ? "Танк сел на корпус — уклоняйтесь от ракет, цельтесь в нижнюю часть" : "Стреляйте в ноги. Танк атакует очередями по три выстрела");
    }

    private updateVarx(delta: number, player: Phaser.Physics.Arcade.Body, actions: BossAction[]): void {
        const dx = player.center.x - this.sprite.x;
        if (this.phaseTwo() && !this.varxPhaseTwoAnnounced) {
            this.varxPhaseTwoAnnounced = true;
            this.state = "phaseChange";
            this.timer = 3000;
        }
        if (this.state === "guard") {
            this.facing = dx < 0 ? -1 : 1;
            if (Math.abs(dx) > 190) this.sprite.x += Math.sign(dx) * 90 * GAME_SCALE * delta / 1000;
        }
        if (this.timer <= 0) {
            if (this.state === "guard") { this.state = "windup"; this.timer = 1200; }
            else if (this.state === "windup") {
                this.state = "strike"; this.timer = 550;
                if (Math.abs(dx) < 330 && Math.abs(player.center.y - this.body.center.y) < 240) actions.push({ type: "hit" });
                if (this.phaseTwo() && Math.abs(dx) < 850) actions.push({ type: "push", vx: Math.sign(dx || this.facing) * 520, vy: -320 });
            } else if (this.state === "strike") { this.state = "recovery"; this.timer = 2400; }
            else { this.state = "guard"; this.timer = 2600; }
        }
        if (this.state === "windup" || this.state === "strike") {
            this.graphics.fillStyle(this.state === "strike" ? 0xd64545 : 0xf2c94c, 0.25);
            this.graphics.fillRect(this.sprite.x + (this.facing < 0 ? -330 : 0), this.groundY - 140, 330, 140);
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
                this.body.width * Math.max(0, this.timer / 1200), 5);
        }
        this.drawVarxAttack();
    }

    private drawVarxAttack(): void {
        const pivotX = this.sprite.x + this.facing * this.body.width * 0.25;
        const pivotY = this.body.top + this.body.height * 0.42;
        let angle = -0.9;
        if (this.state === "windup") angle = -0.9 - (1 - this.timer / 1200) * 1.5;
        if (this.state === "strike") angle = -2.4 + Phaser.Math.Clamp((550 - this.timer) / 280, 0, 1) * 3.3;
        if (this.state === "recovery") angle = 0.9 - (1 - this.timer / 2400) * 1.8;
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
                const progress = 1 - this.timer / 550;
                this.graphics.lineStyle(7, 0xbf90ff, (1 - progress) * 0.8)
                    .strokeCircle(this.sprite.x, this.body.center.y, 60 + progress * 700);
            }
        }
    }

    private updateGolem(delta: number, player: Phaser.Physics.Arcade.Body, actions: BossAction[]): void {
        const dx = player.center.x - this.sprite.x;
        this.facing = dx < 0 ? -1 : 1;
        if (this.state === "walk" && Math.abs(dx) > 320) this.sprite.x += this.facing * 25 * GAME_SCALE * delta / 1000;
        this.sprite.x = Phaser.Math.Clamp(this.sprite.x, this.body.halfWidth, this.width - this.body.halfWidth);
        if (this.timer <= 0) {
            if (this.state === "walk") { this.state = "windup"; this.timer = 1000 / 0.7 * 0.5 * (this.phaseTwo() ? 1 : 1.2); }
            else {
                this.state = "walk"; this.timer = (this.phaseTwo() ? 2000 : 2600 * 1.2) / 0.7 * 0.5;
                for (const direction of [-1, 1]) actions.push({ type: "shot", x: this.sprite.x + direction * (this.body.halfWidth + 15),
                    y: this.groundY - 25, vx: direction * 396 * (this.phaseTwo() ? 1 : 0.8) * GAME_SCALE, vy: 0, size: 30, color: 0xffa84c });
                if (this.phaseTwo()) {
                    this.aim(player, actions, 480 * GAME_SCALE, 360 * GAME_SCALE);
                }
            }
        }
        if (this.phaseTwo()) {
            this.summonCooldown -= delta;
            if (this.summonCooldown <= 0) {
                actions.push({ type: "summon", x: this.sprite.x + this.facing * 180, y: this.groundY - 250 });
                this.summonCooldown = 6000;
            }
        }
        if (this.state === "windup") this.graphics.lineStyle(6, 0xd64545, 0.8).lineBetween(0, this.groundY - 3, this.width, this.groundY - 3);
        this.hint.setText(this.state === "windup" ? "Голем готовит удар по земле — прыгайте!" : "Уязвимо светящееся ядро в груди — попадите в него в прыжке");
    }

    private syncHitZone(): void {
        this.body.updateFromGameObject();
        let top = this.body.top;
        let height = this.body.height;
        let width = this.body.width;
        if (this.definition.type === "sand_worm") height *= 0.42;
        if (this.definition.type === "walking_tank") { top += height * 0.6; height *= 0.4; }
        if (this.definition.type === "scrap_golem") { top += height * 0.32; height *= 0.42; width *= 0.44; }
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
        this.hitZone.destroy(); this.sprite.destroy(); this.graphics.destroy(); this.bar.destroy(); this.title.destroy(); this.hint.destroy();
    }
}
