import Phaser from "phaser";
import Button from "../ui/Button";
import SceneManager from "../managers/SceneManager";
import type { EpisodeMapEntry } from "../interface/EpisodeMapEntry";
// SVG-загрузчик Phaser ожидает URL файла, а не percent-encoded data URL от Vite.
import lock from "../assets/ui/icons/lock.svg?no-inline";

const numerals = ["I", "II", "III", "IV"];
const yellow = "#F2C94C";

export default class ChapterMap extends Phaser.Scene {
    constructor() { super("ChapterMap"); }

    preload(): void {
        if (!this.textures.exists("map-lock")) this.load.svg("map-lock", lock, { width: 60, height: 60 });
    }

    create(): void {
        this.cameras.main.setBackgroundColor("#080D17");
        const episodes = SceneManager.getEpisodeMap();
        let selected = episodes.find(episode => episode.unlocked && episode.canContinue)
            ?? episodes.find(episode => episode.unlocked && episode.stars === 0)
            ?? episodes.find(episode => episode.unlocked)!;
        const textStyle = { fontFamily: "Rubik", fontSize: "27px", color: "#FFFFFF" };
        const leave = (key: string) => {
            this.input.setDefaultCursor("default");
            SceneManager.showScene(this.scene.key, key);
        };
        new Button(this, {
            x: 190, y: 55, width: 285, height: 48, variant: "back", text: "← Главное меню", fontSize: 24,
            backgroundAlpha: 0, textColor: yellow, click: () => leave("MainMenu")
        });
        new Button(this, {
            x: 190, y: 112, width: 285, height: 48, variant: "back", text: "← Сменить героя", fontSize: 24,
            backgroundAlpha: 0, textColor: "#A8A8A8", click: () => leave("CharacterSelect")
        });
        this.add.text(960, 90, "КАРТА ЭПИЗОДОВ", {
            fontFamily: "'Press Start 2P'", fontSize: "54px", color: yellow
        }).setOrigin(0.5);
        const score = this.add.text(1830, 65, "", {
            ...textStyle, fontSize: "30px"
        }).setOrigin(1, 0.5);

        const sky = this.add.graphics().fillStyle(0xffffff, 0.5);
        // Редкие неподвижные звёзды, как на исходном макете.
        for (let index = 0; index < 26; index++) {
            sky.fillCircle(90 + (index * 379 % 1740), 190 + (index * 137 % 555), index % 4 === 0 ? 1.5 : 1);
        }
        const route = this.add.graphics().lineStyle(4.5, 0xa8a8a8, 0.6);
        for (let x = 350; x < 1565; x += 32) route.lineBetween(x, 385, Math.min(x + 18, 1565), 385);

        const selection = this.add.graphics();
        const positions = new Map<number, number>();
        const panel = this.add.graphics().fillStyle(0x0d172a);
        panel.fillRoundedRect(90, 815, 1000, 200, 15);
        const conditions = this.add.text(120, 842, "", { ...textStyle, fontSize: "24px", lineSpacing: 16 });
        const hero = this.add.text(90, 747, `Герой: ${SceneManager.getSelectedCharacter().name}`, {
            ...textStyle, fontSize: "24px", color: "#5FD3FF"
        });
        const status = this.add.text(1560, 825, "", {
            ...textStyle, fontSize: "23px", color: "#A8A8A8", align: "center", wordWrap: { width: 470 }
        }).setOrigin(0.5, 0);
        let startButton: Button | null = null;
        let restartButton: Button | null = null;

        const drawSelection = () => {
            score.setText(`Всего очков: ${SceneManager.getTotalScore().toLocaleString("ru-RU")}`);
            selection.clear().lineStyle(2, 0xf2c94c, 0.5);
            selection.strokeCircle(positions.get(selected.id)!, 385, 104);
            const numeral = numerals[selected.id - 1];
            conditions.setText([
                `Эпизод ${numeral} «${selected.name}» — условия звёзд`,
                `★  Победить босса (${selected.bossName})`,
                `★★  Кристаллы: ${selected.crystalCount} из ${selected.crystalCount} (включая награду босса)`,
                `★★★  Набрать ${selected.starScore.toLocaleString("ru-RU")} очков за эпизод`
            ]);
            hero.setText(`Герой: ${SceneManager.getSelectedCharacter().name}`);
            startButton?.destroy();
            restartButton?.destroy();
            const allowed = selected.heroAllowed;
            status.setText(!allowed ? `Для этого эпизода выберите героя ${selected.requiredHeroName}`
                : selected.canContinue ? "Есть сохранённое прохождение"
                : "Два экрана и арена босса");
            const launch = (continueSaved: boolean) => {
                this.input.setDefaultCursor("default");
                SceneManager.startEpisode(this.scene.key, selected.id, continueSaved);
            };
            startButton = new Button(this, {
                x: 1560, y: 970, width: 540, height: 75,
                text: `${selected.canContinue ? "Продолжить" : "Начать"} эпизод ${numeral}`,
                fontSize: 27, backgroundColor: 0xf2c94c, textColor: "#000000",
                click: () => launch(selected.canContinue)
            });
            if (!allowed) startButton.disableInteractive().setAlpha(0.4);
            restartButton = null;
            if (selected.canContinue && allowed) {
                restartButton = new Button(this, {
                    x: 1560, y: 1035, width: 450, height: 40, text: "Начать эпизод заново",
                    fontSize: 21, backgroundAlpha: 0, textColor: "#A8A8A8", click: () => launch(false)
                });
            }
        };

        episodes.forEach((episode: EpisodeMapEntry, index) => {
            const x = 350 + index * 405;
            positions.set(episode.id, x);
            const color = !episode.unlocked ? 0x505050 : episode.stars > 0 ? 0xc9a36a : 0x5af6b8;
            const planet = this.add.circle(x, 385, 90, color).setStrokeStyle(4.5, episode.unlocked ? 0xf2c94c : 0x323232);
            if (episode.unlocked) {
                planet.setInteractive({ useHandCursor: true });
                planet.on("pointerdown", () => { selected = episode; drawSelection(); });
                planet.on("pointerover", () => planet.setAlpha(0.85));
                planet.on("pointerout", () => planet.setAlpha(1));
            } else {
                this.add.image(x, 385, "map-lock").setDisplaySize(45, 45).setAlpha(0.7);
            }
            this.add.text(x, 505, `ЭПИЗОД ${numerals[index]}`, {
                fontFamily: "'Press Start 2P'", fontSize: "24px", color: episode.unlocked ? yellow : "#A8A8A8"
            }).setOrigin(0.5);
            this.add.text(x, 552, episode.name, { ...textStyle, align: "center", wordWrap: { width: 390 } }).setOrigin(0.5, 0);
            this.add.text(x, 605, episode.location + (episode.requiredHeroName ? ` · только ${episode.requiredHeroName}` : ""), {
                ...textStyle, fontSize: "21px", color: "#A8A8A8", align: "center", wordWrap: { width: 360 }
            }).setOrigin(0.5, 0);
            for (let star = 0; star < 3; star++) {
                this.add.text(x + (star - 1) * 36, 687, "★", {
                    ...textStyle, fontSize: "34px", color: star < episode.stars ? yellow : "#323A48"
                }).setOrigin(0.5);
            }
            if (!episode.unlocked) this.add.text(x, 742, `После эпизода ${numerals[index - 1]}`, {
                ...textStyle, fontSize: "20px", color: "#747E90"
            }).setOrigin(0.5);
        });
        drawSelection();
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.setDefaultCursor("default"));
    }
}
