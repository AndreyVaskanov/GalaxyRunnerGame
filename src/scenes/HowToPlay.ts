import Phaser from "phaser";
import SceneManager from "../managers/SceneManager";
import Button from "../ui/Button";
import { keyLabel } from "../config/Controls";

export default class HowToPlay extends Phaser.Scene {
    constructor() { super("HowToPlay"); }

    create(): void {
        this.cameras.main.setBackgroundColor("#080D17");
        const style = { fontFamily: "Rubik", fontSize: "24px", color: "#FFFFFF" };
        const leave = (to: string) => {
            this.input.setDefaultCursor("default");
            SceneManager.showScene(this.scene.key, to);
        };
        new Button(this, {
            x: 210, y: 65, width: 330, height: 55, variant: "back", text: "← Главное меню", fontSize: 24,
            backgroundAlpha: 0, textColor: "#A8A8A8", click: () => leave("MainMenu")
        });
        this.add.text(960, 100, "КАК ИГРАТЬ", {
            fontFamily: "'Press Start 2P'", fontSize: "54px", color: "#F2C94C"
        }).setOrigin(0.5);
        this.add.text(90, 225, "УПРАВЛЕНИЕ", { fontFamily: "'Press Start 2P'", fontSize: "36px", color: "#FFFFFF" });
        this.add.text(1005, 225, "ПРАВИЛА", { fontFamily: "'Press Start 2P'", fontSize: "36px", color: "#FFFFFF" });
        const keys = SceneManager.getSettings().keys;
        const rows = [
            [`${keyLabel(keys.left)} / ${keyLabel(keys.leftAlternative)}    ${keyLabel(keys.right)} / ${keyLabel(keys.rightAlternative)}`, "Бег влево и вправо"],
            [`${keyLabel(keys.jump)} / ${keyLabel(keys.jumpAlternative)}`, "Прыжок"],
            [`${keyLabel(keys.attack)}${keys.attackAlternative ? ` / ${keyLabel(keys.attackAlternative)}` : ""}`, "Выстрел из бластера"],
            [`${keyLabel(keys.pause)}${keys.pauseAlternative ? ` / ${keyLabel(keys.pauseAlternative)}` : ""}`, "Пауза"]
        ];
        rows.forEach(([keys, action], index) => {
            const y = 345 + index * 130;
            const plate = this.add.graphics().fillStyle(0x141432, 0.9);
            plate.fillRoundedRect(90, y - 30, 300, 60, 12);
            this.add.text(240, y, keys, { ...style, color: "#A8A8A8", align: "center", wordWrap: { width: 280 } }).setOrigin(0.5);
            this.add.text(420, y, action, { ...style, wordWrap: { width: 500 } }).setOrigin(0, 0.5);
        });
        const rules = [
            ["Уровень", "Три экрана в эпизоде. Идите вправо. Для завершения эпизода победите босса."],
            ["Чекпоинт", "Коснитесь флага — он станет зелёным. Продолжение с чекпоинта возвращает здоровье, очки и предметы на момент взятия флага."],
            ["Кристаллы", "+100 очков за предмет. На локации — 15, за босса — ещё 10. В запасе — не более 100. После покупки героя запас можно пополнить."],
            ["Звёзды", "★ — завершить эпизод; ★★ — собрать 25 из 25 кристаллов, включая награду босса; ★★★ — достичь нужного счёта эпизода."]
        ];
        rules.forEach(([title, description], index) => {
            const y = 315 + index * 160;
            this.add.text(1005, y, title, { ...style, fontSize: "27px", fontStyle: "bold", color: "#F2C94C" });
            this.add.text(1005, y + 45, description, { ...style, fontSize: "22px", wordWrap: { width: 795 }, lineSpacing: 8 });
        });
        new Button(this, {
            x: 330, y: 950, width: 480, height: 75, text: "Настроить управление", fontSize: 27,
            backgroundColor: 0x141e2e, borderWidth: 2, borderColor: 0x5b6b83, click: () => leave("Settings")
        });
    }
}
