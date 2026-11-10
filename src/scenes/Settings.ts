import Phaser from "phaser";
import SceneManager from "../managers/SceneManager";
import Button from "../ui/Button";
import VolumeSlider from "../ui/VolumeSlider";
import { bindingFromCode, keyLabel } from "../config/Controls";
import type { ControlBinding } from "../config/Controls";

export default class Settings extends Phaser.Scene {
    private content!: Phaser.GameObjects.Container;
    private status!: Phaser.GameObjects.Text;
    private pending: ControlBinding | null = null;
    private modal: Phaser.GameObjects.Container | null = null;
    private confirmModal: (() => void) | null = null;
    private cancelModal: (() => void) | null = null;

    constructor() { super("Settings"); }

    create(): void {
        this.pending = null;
        this.modal = null;
        this.confirmModal = null;
        this.cancelModal = null;
        this.cameras.main.setBackgroundColor("#080D17");
        this.add.text(960, 100, "НАСТРОЙКИ", {
            fontFamily: "'Press Start 2P'", fontSize: "54px", color: "#F2C94C"
        }).setOrigin(0.5);
        new Button(this, {
            x: 210, y: 65, width: 330, height: 55, variant: "back", text: "← Главное меню", fontSize: 24,
            backgroundAlpha: 0, textColor: "#F2C94C", click: () => {
                if (this.modal) return;
                this.input.setDefaultCursor("default");
                SceneManager.showScene(this.scene.key, "MainMenu");
            }
        });
        this.content = this.add.container();
        this.status = this.add.text(960, 1000, "", {
            fontFamily: "Rubik", fontSize: "24px", color: "#A8A8A8", align: "center", wordWrap: { width: 1650 }
        }).setOrigin(0.5);
        this.drawContent();
        const capture = (event: KeyboardEvent) => {
            if (this.modal && !event.repeat) {
                const action = event.code === "Enter" || event.code === "NumpadEnter" ? this.confirmModal
                    : event.code === "Escape" ? this.cancelModal : null;
                if (action) { event.preventDefault(); event.stopImmediatePropagation(); action(); }
                return;
            }
            if (this.modal || !this.pending || event.repeat) return;
            event.preventDefault();
            event.stopPropagation();
            if (event.code === "Escape" && this.pending !== "pause" && this.pending !== "pauseAlternative") {
                this.pending = null;
                this.status.setText("Ввод отменён").setColor("#A8A8A8");
                this.drawContent();
                return;
            }
            const key = event.ctrlKey || event.metaKey || event.altKey ? null : bindingFromCode(event.code);
            if (!key) { this.status.setText("Выберите букву, цифру, стрелку, пробел или другую обычную клавишу.").setColor("#FF9B9B"); return; }
            this.applyBinding(this.pending, key);
        };
        const captureMouse = (event: MouseEvent) => {
            if (this.modal || !this.pending || event.button !== 0) return;
            if (event.target !== this.game.canvas) return;
            event.preventDefault(); event.stopImmediatePropagation();
            this.applyBinding(this.pending, "MOUSE_LEFT");
        };
        window.addEventListener("keydown", capture, true);
        window.addEventListener("mousedown", captureMouse, true);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener("keydown", capture, true);
            window.removeEventListener("mousedown", captureMouse, true);
            this.confirmModal = null;
            this.cancelModal = null;
            this.input.setDefaultCursor("default");
        });
    }

    private applyBinding(binding: ControlBinding, key: string): void {
        const result = SceneManager.assignKey(binding, key);
        if (result.conflict) {
            this.pending = null;
            this.drawContent();
            this.confirmSwap(binding, key);
            return;
        }
        if (result.applied) { this.pending = null; this.drawContent(); }
        this.status.setText(result.message).setColor(result.saved ? "#5AF6B8" : "#FF9B9B");
    }

    private confirmSwap(binding: ControlBinding, key: string): void {
        const modal = this.add.container().setDepth(200);
        this.modal = modal;
        modal.add(this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.7).setInteractive());
        modal.add(this.add.rectangle(960, 540, 1000, 380, 0x141432).setStrokeStyle(2, 0xa8a8a8));
        modal.add(this.add.text(960, 420, "КЛАВИША ЗАНЯТА", { fontFamily: "Rubik", fontSize: "36px", color: "#F2C94C" }).setOrigin(0.5));
        modal.add(this.add.text(960, 510, `Поменять ${keyLabel(SceneManager.getSettings().keys[binding])} и ${keyLabel(key)} местами?`, {
            fontFamily: "Rubik", fontSize: "28px", color: "#FFFFFF"
        }).setOrigin(0.5));
        modal.add(this.add.text(960, 565, "Enter — поменять местами · Esc — отменить", {
            fontFamily: "Rubik", fontSize: "23px", color: "#A8A8A8"
        }).setOrigin(0.5));
        const close = () => {
            modal.destroy(); this.modal = null; this.confirmModal = null; this.cancelModal = null;
            this.input.setDefaultCursor("default");
        };
        const confirm = () => {
            const result = SceneManager.assignKey(binding, key, true);
            close(); this.drawContent();
            this.status.setText(result.message).setColor(result.saved ? "#5AF6B8" : "#FF9B9B");
        };
        this.confirmModal = confirm;
        this.cancelModal = close;
        modal.add(new Button(this, { x: 760, y: 640, width: 300, height: 65, text: "Отмена", click: close }));
        modal.add(new Button(this, { x: 1160, y: 640, width: 300, height: 65, text: "Поменять местами", backgroundColor: 0xf2c94c, textColor: "#000000", click: confirm }));
    }

    private drawContent(): void {
        this.content.removeAll(true);
        const settings = SceneManager.getSettings();
        const style = { fontFamily: "Rubik", fontSize: "24px", color: "#FFFFFF" };
        const add = <T extends Phaser.GameObjects.GameObject>(object: T): T => { this.content.add(object); return object; };
        add(this.add.text(90, 205, "УПРАВЛЕНИЕ", { fontFamily: "'Press Start 2P'", fontSize: "30px", color: "#FFFFFF" }));
        add(this.add.text(1140, 205, "ЗВУК", { fontFamily: "'Press Start 2P'", fontSize: "30px", color: "#FFFFFF" }));
        add(this.add.text(90, 275, "Действие", { ...style, fontSize: "21px", color: "#A8A8A8" }));
        add(this.add.text(510, 275, "Основная", { ...style, fontSize: "21px", color: "#A8A8A8" }).setOrigin(0.5, 0));
        add(this.add.text(760, 275, "Дополнительная", { ...style, fontSize: "21px", color: "#A8A8A8" }).setOrigin(0.5, 0));
        const rows: { label: string; primary: ControlBinding; alternative?: ControlBinding }[] = [
            { label: "Влево", primary: "left", alternative: "leftAlternative" },
            { label: "Вправо", primary: "right", alternative: "rightAlternative" },
            { label: "Прыжок", primary: "jump", alternative: "jumpAlternative" },
            { label: "Атака / выстрел", primary: "attack", alternative: "attackAlternative" },
            { label: "Пауза", primary: "pause", alternative: "pauseAlternative" }
        ];
        rows.forEach((row, index) => {
            const y = 345 + index * 85;
            add(this.add.text(90, y, row.label, style).setOrigin(0, 0.5));
            [row.primary, row.alternative].forEach((binding, column) => {
                const x = column === 0 ? 510 : 760;
                if (!binding) { add(this.add.text(x, y, row.primary === "attack" ? "ЛКМ" : "—", { ...style, color: "#505A6D" }).setOrigin(0.5)); return; }
                const waiting = binding === this.pending;
                add(new Button(this, {
                    x, y, width: 210, height: 60, text: waiting ? "Нажмите клавишу…" : keyLabel(settings.keys[binding]),
                    fontSize: waiting ? 18 : 24, backgroundColor: 0x141823,
                    borderWidth: waiting ? 3 : 0, borderColor: 0xf2c94c, textColor: waiting ? "#F2C94C" : "#FFFFFF",
                    click: () => {
                        if (this.modal) return;
                        this.pending = this.pending === binding ? null : binding;
                        this.status.setText(this.pending ? "Ожидание клавиши…" : "").setColor("#F2C94C");
                        this.drawContent();
                    }
                }));
            });
        });
        const hint = add(this.add.graphics().lineStyle(1.5, 0x962828));
        hint.strokeRoundedRect(90, 800, 765, 105, 9);
        add(this.add.text(110, 817, "Выберите ячейку и нажмите клавишу или ЛКМ.\nEsc — отмена; в строке паузы назначает Esc.\nОбмен занятых клавиш: Enter — подтвердить, Esc — отменить.", {
            ...style, fontSize: "20px", color: "#C9A36A", lineSpacing: 4
        }));
        const slider = (label: string, key: "musicVolume" | "effectsVolume", y: number) => {
            add(this.add.text(1140, y, label, { ...style, fontSize: "27px" }));
            const percent = add(this.add.text(1740, y, `${Math.round(settings[key] * 100)}%`, {
                ...style, fontSize: "27px", color: "#F2C94C"
            }).setOrigin(1, 0));
            add(new VolumeSlider(this, 1440, y + 70, 600, settings[key], value => {
                const saved = SceneManager.updateSettings({ ...SceneManager.getSettings(), [key]: value });
                percent.setText(`${Math.round(value * 100)}%`);
                this.status.setText(saved ? "Настройки сохранены" : "Громкость применена, но сохранить её в браузере не удалось.")
                    .setColor(saved ? "#5AF6B8" : "#FF9B9B");
            }));
            const ticks = add(this.add.graphics().lineStyle(2, 0xa8a8a8));
            for (let value = 0; value <= 100; value += 10) {
                const x = 1140 + value * 6;
                ticks.lineBetween(x, y + 95, x, y + 105);
                add(this.add.text(x, y + 115, String(value), { ...style, fontSize: "17px", color: "#A8A8A8" }).setOrigin(0.5, 0));
            }
        };
        slider("Музыка", "musicVolume", 315);
        slider("Звуки игры", "effectsVolume", 520);
        add(this.add.text(1140, 710, "Шаг — 10%. Изменения сохраняются сразу.\nАудио пока недоступно.", {
            ...style, fontSize: "21px", color: "#C9A36A", lineSpacing: 8
        }));
        add(new Button(this, {
            x: 1440, y: 845, width: 600, height: 75, text: "↶ Сбросить по умолчанию", fontSize: 27,
            backgroundAlpha: 0, borderWidth: 1.5, borderColor: 0xa8a8a8, click: () => this.confirmReset()
        }));
    }

    private confirmReset(): void {
        if (this.modal) return;
        this.pending = null;
        this.drawContent();
        const modal = this.add.container().setDepth(200);
        this.modal = modal;
        modal.add(this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.6).setInteractive());
        const panel = this.add.graphics().fillStyle(0x141432).lineStyle(3, 0xa8a8a8);
        panel.fillRoundedRect(510, 277.5, 900, 525, 15).strokeRoundedRect(510, 277.5, 900, 525, 15);
        modal.add(panel);
        modal.add(this.add.text(570, 330, "СБРОСИТЬ НАСТРОЙКИ?", {
            fontFamily: "'Press Start 2P'", fontSize: "30px", color: "#F2C94C"
        }));
        modal.add(this.add.text(570, 440, "Назначения клавиш вернутся к исходным.\nГромкость музыки — 70%, звуков — 80%.", {
            fontFamily: "Rubik", fontSize: "24px", color: "#FFFFFF", lineSpacing: 12
        }));
        modal.add(this.add.text(570, 550, "Прогресс, покупки героев и рекорды сохранятся.", {
            fontFamily: "Rubik", fontSize: "21px", color: "#A8A8A8"
        }));
        const close = () => { modal.destroy(); this.modal = null; this.input.setDefaultCursor("default"); };
        modal.add(new Button(this, {
            x: 800, y: 690, width: 270, height: 67.5, text: "Отмена", fontSize: 24,
            backgroundColor: 0xf2c94c, textColor: "#000000", click: close
        }));
        modal.add(new Button(this, {
            x: 1120, y: 690, width: 270, height: 67.5, text: "Сбросить", fontSize: 24,
            backgroundAlpha: 0, borderWidth: 3, click: () => {
                const saved = SceneManager.resetSettings();
                close();
                this.drawContent();
                this.status.setText(saved ? "Настройки сброшены и сохранены" : "Настройки сброшены, но сохранить их в браузере не удалось.")
                    .setColor(saved ? "#5AF6B8" : "#FF9B9B");
            }
        }));
    }
}
