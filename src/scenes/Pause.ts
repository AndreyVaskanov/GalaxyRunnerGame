import Phaser from "phaser";
import SceneManager from "../managers/SceneManager";
import Button from "../ui/Button";
import VolumeSlider from "../ui/VolumeSlider";

export default class Pause extends Phaser.Scene {
    constructor() { super("Pause"); }

    create(): void {
        const { width, height } = this.scale;
        const cx = width / 2;
        const cy = height / 2;
        const binding = SceneManager.getSettings().keys.pause;
        const keyboard = this.input.keyboard!;
        const pauseKey = keyboard.addKey(binding);
        const pauseEvent = `keydown-${binding}`;
        const resume = (event: KeyboardEvent) => {
            if (event.repeat) return;
            // Одно нажатие не должно снова открыть игровую паузу после resume.
            event.stopPropagation();
            SceneManager.resumeGame();
        };
        keyboard.on(pauseEvent, resume);

        // Отдельная UI-сцена продолжает работать, пока игровой уровень на паузе.
        this.add.rectangle(cx, cy, width, height, 0x000000, 0.7).setInteractive();
        const panel = this.add.graphics();
        panel.fillStyle(0x080d17, 1);
        panel.fillRoundedRect(cx - 300, cy - 375, 600, 750, 18);
        this.add.text(cx, cy - 300, "ПАУЗА", {
            fontFamily: "'Press Start 2P'", fontSize: "54px", color: "#F2C94C"
        }).setOrigin(0.5);

        const act = (action: () => void) => () => {
            this.input.setDefaultCursor("default");
            action();
        };
        new Button(this, {
            x: cx, y: cy - 195, width: 450, height: 75, radius: 12,
            text: "Продолжить", fontSize: 27, backgroundColor: 0xf2c94c,
            textColor: "#000000", click: act(() => SceneManager.resumeGame())
        });
        new Button(this, {
            x: cx, y: cy - 97.5, width: 450, height: 75, radius: 12,
            text: "Начать уровень заново", fontSize: 27, backgroundAlpha: 0,
            borderWidth: 1.5, borderColor: 0xa8a8a8, click: act(() => SceneManager.restartGame())
        });

        const settings = SceneManager.getSettings();
        const status = this.add.text(cx, cy + 340, "", {
            fontFamily: "Rubik", fontSize: "17px", color: "#A8A8A8", wordWrap: { width: 480 }, align: "center"
        }).setOrigin(0.5);
        const slider = (label: string, key: "musicVolume" | "effectsVolume", y: number) => {
            this.add.text(cx - 150, y, label, { fontFamily: "Rubik", fontSize: "24px", color: "#FFFFFF" });
            const percent = this.add.text(cx + 150, y, `${Math.round(settings[key] * 100)}%`, {
                fontFamily: "Rubik", fontSize: "24px", color: "#5FD3FF"
            }).setOrigin(1, 0);
            new VolumeSlider(this, cx, y + 45, 300, settings[key], value => {
                const current = SceneManager.getSettings();
                const saved = SceneManager.updateSettings({ ...current, [key]: value });
                percent.setText(`${Math.round(value * 100)}%`);
                status.setText(saved ? "" : "Настройки применены, но не удалось сохранить их в браузере.");
            });
        };
        slider("Музыка", "musicVolume", cy - 22.5);
        slider("Звуки", "effectsVolume", cy + 82.5);
        if (SceneManager.canRestoreCheckpoint()) {
            new Button(this, {
                x: cx, y: cy + 187.5, width: 450, height: 50, text: "Вернуться к чекпоинту",
                fontSize: 23, textColor: "#5FD3FF", backgroundAlpha: 0,
                click: act(() => SceneManager.restoreCheckpoint())
            });
        }
        new Button(this, {
            x: cx, y: cy + 270, width: 450, height: 75, radius: 12,
            text: "Выйти на карту эпизодов", fontSize: 25, backgroundAlpha: 0,
            click: act(() => SceneManager.exitToChapterMap())
        });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            keyboard.off(pauseEvent, resume);
            keyboard.removeKey(pauseKey, true);
            this.input.setDefaultCursor("default");
        });
    }

}
