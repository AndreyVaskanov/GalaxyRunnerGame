import Phaser from "phaser";

// Действующий регулятор: нажатие/перетаскивание с шагом 10%.
export default class VolumeSlider extends Phaser.GameObjects.Container {
    private value: number;
    private readonly fill: Phaser.GameObjects.Rectangle;
    private readonly thumb: Phaser.GameObjects.Arc;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number,
        value: number, onChange: (value: number) => void) {
        super(scene, x, y);
        this.value = value;
        const track = scene.add.rectangle(-width / 2, 0, width, 6, 0x646464).setOrigin(0, 0.5);
        this.fill = scene.add.rectangle(-width / 2, 0, width * value, 6, 0x5fd3ff).setOrigin(0, 0.5);
        this.thumb = scene.add.circle(-width / 2 + width * value, 0, 12, 0x5fd3ff);
        this.add([track, this.fill, this.thumb]);
        this.setInteractive(new Phaser.Geom.Rectangle(-width / 2 - 12, -24, width + 24, 48), Phaser.Geom.Rectangle.Contains);
        scene.input.setDraggable(this);
        const change = (pointer: Phaser.Input.Pointer) => {
            const next = Phaser.Math.Clamp(Math.round((pointer.worldX - x + width / 2) / width * 10) / 10, 0, 1);
            if (next === this.value) return;
            this.value = next;
            this.fill.width = width * next;
            this.thumb.x = -width / 2 + width * next;
            onChange(next);
        };
        this.on("pointerdown", change);
        this.on("drag", change);
        this.on("pointerover", () => scene.input.setDefaultCursor("pointer"));
        this.on("pointerout", () => scene.input.setDefaultCursor("default"));
        scene.add.existing(this);
    }
}
