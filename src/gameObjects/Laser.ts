import type Phaser from "phaser";

export default class Laser {
    public readonly beam: Phaser.GameObjects.Image;
    public readonly top: Phaser.GameObjects.Rectangle;
    private readonly body: Phaser.Physics.Arcade.StaticBody;
    private readonly emitters: Phaser.GameObjects.Graphics;
    private readonly label: Phaser.GameObjects.Text;
    private elapsed = 0;
    private readonly interval: number;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, toggleSec: number) {
        this.interval = Math.max(1, toggleSec) * 1000;
        this.beam = scene.add.image(x, y, "stationLaser").setOrigin(0).setDisplaySize(width, height).setDepth(2);
        scene.physics.add.existing(this.beam, true);
        this.body = this.beam.body as Phaser.Physics.Arcade.StaticBody;
        this.top = scene.add.rectangle(x - 6, y - 12, width + 12, 12, 0x282d40).setOrigin(0).setDepth(3);
        scene.physics.add.existing(this.top, true);
        this.emitters = scene.add.graphics().setDepth(3);
        this.emitters.fillStyle(0x282d40).fillRect(x - 6, y - 12, width + 12, 12)
            .fillRect(x - 6, y + height, width + 12, 12);
        this.emitters.lineStyle(3, 0xff7777).lineBetween(x, y - 3, x + width, y - 3)
            .lineBetween(x, y + height + 3, x + width, y + height + 3);
        this.label = scene.add.text(x + width / 2, y - 25, "", {
            fontFamily: "Rubik", fontSize: "21px", color: "#FF7777", backgroundColor: "#080D17",
            padding: { x: 8, y: 4 }
        }).setOrigin(0.5, 1).setDepth(3);
        this.update(0);
    }

    public isActive(): boolean { return this.body.enable; }

    public update(delta: number): void {
        this.elapsed = (this.elapsed + delta) % (this.interval * 2);
        const active = this.elapsed < this.interval;
        const warning = !active && this.elapsed >= this.interval * 2 - 600;
        this.body.enable = active;
        this.beam.setAlpha(active ? 0.85 + Math.sin(this.elapsed / 45) * 0.15
            : warning ? 0.12 + (Math.sin(this.elapsed / 65) + 1) * 0.12 : 0.06);
        this.label.setText(active ? "ЛАЗЕР" : warning ? "ВКЛЮЧЕНИЕ!" : "ПРОХОДИТЕ")
            .setColor(active || warning ? "#FF7777" : "#5AF6B8");
    }

    public destroy(): void { this.beam.destroy(); this.top.destroy(); this.emitters.destroy(); this.label.destroy(); }
}
