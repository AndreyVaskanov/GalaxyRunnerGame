import Phaser from "phaser";
import SceneManager from "../managers/SceneManager";
import Button from "../ui/Button";

export default class GameOver extends Phaser.Scene {
    constructor() { super("GameOver"); }

    create(): void {
        this.add.rectangle(960, 540, 1920, 1080, 0x080d17);
        this.add.text(960, 310, "ИГРА ОКОНЧЕНА", {
            fontFamily: "'Press Start 2P'", fontSize: "72px", color: "#D64545"
        }).setOrigin(0.5);
        const action = (text: string, y: number, click: () => void, primary = false) => new Button(this, {
            x: 960, y, width: 570, height: 90, text, fontSize: 30,
            backgroundColor: 0xf2c94c, backgroundAlpha: primary ? 1 : 0,
            borderWidth: primary ? 0 : 1.5, textColor: primary ? "#000000" : "#FFFFFF",
            click: () => { this.input.setDefaultCursor("default"); click(); }
        });
        const checkpoint = SceneManager.canRestoreCheckpoint();
        if (checkpoint) action("Продолжить с чекпоинта", 510, () => SceneManager.restoreCheckpoint(), true);
        action("Начать эпизод заново", checkpoint ? 630 : 510, () => SceneManager.restartGame(), !checkpoint);
        action("На карту эпизодов", checkpoint ? 750 : 630, () => SceneManager.exitToChapterMap());
    }
}
