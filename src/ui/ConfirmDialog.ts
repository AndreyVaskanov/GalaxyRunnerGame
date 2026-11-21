import Phaser from "phaser";
import Button from "./Button";

interface ConfirmDialogConfig {
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
    onClose: () => void;
}

/** Modal with a full-screen input blocker and scene-owned cleanup. */
export default class ConfirmDialog extends Phaser.GameObjects.Container {
    private closed = false;
    private readonly config: ConfirmDialogConfig;
    private readonly escape = () => this.close();

    constructor(scene: Phaser.Scene, config: ConfirmDialogConfig) {
        super(scene, 960, 540);
        this.config = config;
        scene.add.existing(this);
        this.setDepth(1000);
        const overlay = scene.add.rectangle(0, 0, 1920, 1080, 0x000000, 0.6).setInteractive();
        overlay.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => event.stopPropagation());
        this.add(overlay);
        const panel = scene.add.graphics().fillStyle(0x141432).lineStyle(3, 0xa8a8a8);
        panel.fillRoundedRect(-450, -262.5, 900, 525, 15).strokeRoundedRect(-450, -262.5, 900, 525, 15);
        this.add(panel);
        this.add(scene.add.text(0, -185, config.title, {
            fontFamily: "'Press Start 2P'", fontSize: "30px", color: "#F2C94C",
            align: "center", lineSpacing: 12, wordWrap: { width: 780 }
        }).setOrigin(0.5, 0));
        this.add(scene.add.text(0, -20, config.message, {
            fontFamily: "Rubik", fontSize: "24px", color: "#FFFFFF",
            align: "center", lineSpacing: 12, wordWrap: { width: 780 }
        }).setOrigin(0.5, 0));
        this.add(new Button(scene, {
            x: -160, y: 165, width: 270, height: 67.5, text: "Остаться", fontSize: 24,
            backgroundColor: 0xf2c94c, textColor: "#000000", sound: "uiCancel", click: this.escape
        }));
        this.add(new Button(scene, {
            x: 160, y: 165, width: 270, height: 67.5, text: config.confirmText, fontSize: 24,
            backgroundAlpha: 0, borderWidth: 3, sound: "uiConfirm",
            click: () => {
                if (this.closed) return;
                this.close();
                config.onConfirm();
            }
        }));
        scene.input.keyboard?.on("keydown-ESC", this.escape);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.escape);
    }

    private close(): void { this.destroy(); }

    override destroy(fromScene?: boolean): void {
        if (this.closed) return;
        this.closed = true;
        const scene = this.scene;
        scene.input.keyboard?.off("keydown-ESC", this.escape);
        scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.escape);
        scene.input.setDefaultCursor("default");
        this.config.onClose();
        super.destroy(fromScene);
    }
}
