import type Phaser from "phaser";
import SceneManager from "../managers/SceneManager";
import Button from "./Button";
import rules from "../data/rules.json";

export default class GameHud {
    private readonly health: Phaser.GameObjects.Text;
    private readonly crystals: Phaser.GameObjects.Text;
    private readonly score: Phaser.GameObjects.Text;
    private readonly totalScore: Phaser.GameObjects.Text;
    private readonly episode: Phaser.GameObjects.Text;
    private readonly message: Phaser.GameObjects.Text;
    private readonly exitGlow: Phaser.GameObjects.Graphics;
    private readonly exitHint: Phaser.GameObjects.Text;
    private readonly scene: Phaser.Scene;
    private previousScreen: string | null = null;

    constructor(scene: Phaser.Scene, heroName: string) {
        this.scene = scene;
        const style = { fontFamily: "Rubik", fontSize: "30px", color: "#FFFFFF" };
        scene.add.rectangle(0, 0, 1920, 90, 0x080d17, 0.9).setOrigin(0).setDepth(100);
        scene.add.image(48, 45, "heart").setDisplaySize(36, 36).setDepth(101);
        this.health = scene.add.text(80, 45, "", style).setOrigin(0, 0.5).setDepth(101);
        scene.add.image(175, 45, "crystal").setDisplaySize(30, 42).setDepth(101);
        this.crystals = scene.add.text(210, 45, "", { ...style, color: "#5FD3FF" }).setOrigin(0, 0.5).setDepth(101);
        this.score = scene.add.text(675, 45, "", style).setOrigin(0.5).setDepth(101);
        this.totalScore = scene.add.text(1005, 45, "", { ...style, fontSize: "24px", color: "#A8A8A8" }).setOrigin(0.5).setDepth(101);
        scene.add.text(1200, 45, heroName, { ...style, fontSize: "27px", color: "#5FD3FF" }).setOrigin(0, 0.5).setDepth(101);
        this.episode = scene.add.text(1725, 45, "", { ...style, fontSize: "24px", color: "#A8A8A8" })
            .setOrigin(1, 0.5).setDepth(101);
        new Button(scene, {
            x: 1835, y: 45, width: 60, height: 60, text: "Ⅱ", fontSize: 30,
            borderWidth: 2, backgroundAlpha: 0, click: () => SceneManager.pauseGame()
        }).setDepth(101);
        this.message = scene.add.text(960, 110, "", { ...style, fontSize: "22px", color: "#080D17",
            backgroundColor: "#F2C94C", padding: { x: 12, y: 6 } }).setOrigin(0.5, 0).setDepth(101);
        this.exitGlow = scene.add.graphics().setDepth(90);
        for (const [width, alpha] of [[90, 0.025], [45, 0.045], [12, 0.13]]) {
            this.exitGlow.fillStyle(0x5fd3ff, alpha).fillRect(1920 - width, 90, width, 990);
        }
        this.exitHint = scene.add.text(1860, 825, "Дальше\n→", {
            ...style, fontSize: "24px", align: "center", color: "#FFFFFF",
            backgroundColor: "#080D17", padding: { x: 10, y: 6 }
        }).setOrigin(0.5).setAlpha(0.55).setDepth(91);
        this.update();
    }

    public update(): void {
        const data = SceneManager.getHudData();
        if (!data) return;
        this.health.setText(String(data.health));
        this.crystals.setText(`${data.crystals} / ${rules.crystal.gameLimit}`);
        this.score.setText(`За эпизод: ${String(data.score).padStart(6, "0")}`);
        this.totalScore.setText(`Всего: ${String(data.totalScore).padStart(6, "0")}`);
        this.episode.setText(`Эпизод ${["I", "II", "III", "IV"][data.episodeId - 1]}`);
        this.message.setText(data.message).setVisible(data.message.length > 0);
        this.exitGlow.setVisible(data.screenIndex < 2);
        this.exitHint.setVisible(data.screenIndex < 2);
        const screen = `${data.episodeId}:${data.screenIndex}`;
        if (this.previousScreen !== null && this.previousScreen !== screen) {
            // Визуальный переход не останавливает игровой цикл и не меняет состояние прохождения.
            this.scene.cameras.main.fadeIn(220, 8, 13, 23);
        }
        this.previousScreen = screen;
    }
}
