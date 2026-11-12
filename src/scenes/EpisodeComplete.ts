import Phaser from "phaser";
import SceneManager from "../managers/SceneManager";
import Button from "../ui/Button";
import type { EpisodeResult } from "../interface/RunData";

export default class EpisodeComplete extends Phaser.Scene {
    private result: EpisodeResult | null = null;

    constructor() { super("EpisodeComplete"); }

    init(data: { result?: EpisodeResult }): void { this.result = data.result ?? null; }

    create(): void {
        const result = this.result;
        if (!result) { SceneManager.showScene(this.scene.key, "ChapterMap"); return; }
        const episodes = SceneManager.getEpisodeMap();
        const episode = episodes.find(item => item.id === result.episodeId)!;
        const next = episodes.find(item => item.id === result.nextEpisodeId);
        const style = { fontFamily: "Rubik", fontSize: "42px", color: "#FFFFFF" };
        this.cameras.main.setBackgroundColor("#080D17");
        const act = (callback: () => void) => () => {
            this.input.setDefaultCursor("default");
            callback();
        };
        new Button(this, {
            x: 210, y: 65, width: 330, height: 55, variant: "back", text: "← Главное меню", fontSize: 24,
            backgroundAlpha: 0, textColor: "#A8A8A8",
            click: act(() => SceneManager.showScene(this.scene.key, "MainMenu"))
        });
        this.add.text(960, 240, result.nextEpisodeId ? "ЭПИЗОД ПРОЙДЕН!" : "ИГРА ПРОЙДЕНА!", {
            fontFamily: "'Press Start 2P'", fontSize: "63px", color: "#F2C94C"
        }).setOrigin(0.5);
        this.add.text(960, 330, episode.name, { ...style, fontSize: "33px", color: "#A8A8A8" }).setOrigin(0.5);
        this.add.text(960, 430, `Очки эпизода: ${result.score.toLocaleString("ru-RU")} / ${result.maxScore.toLocaleString("ru-RU")}`, style).setOrigin(0.5);
        this.add.text(960, 495, `Кристаллы: ${result.crystals} / ${result.crystalCount}`, style).setOrigin(0.5);
        this.add.text(960, 555, `Лучший результат: ${result.bestScore.toLocaleString("ru-RU")}`, {
            ...style, fontSize: "27px", color: "#A8A8A8"
        }).setOrigin(0.5);
        for (let index = 0; index < 3; index++) this.add.text(960 + (index - 1) * 100, 650, "★", {
            ...style, fontSize: "75px", color: index < result.stars ? "#F2C94C" : "#505050"
        }).setOrigin(0.5);
        const saved = this.add.text(960, 750, result.saved ? "Прогресс сохранён" : "Не удалось сохранить прогресс в браузере", {
            ...style, fontSize: "24px", color: result.saved ? "#5AF6B8" : "#FF9B9B"
        }).setOrigin(0.5);
        if (!result.saved) {
            const retry = new Button(this, {
                x: 960, y: 795, width: 360, height: 40, text: "Повторить сохранение", fontSize: 22,
                backgroundAlpha: 0, textColor: "#F2C94C", click: () => {
                    result.saved = SceneManager.saveProgress();
                    if (result.saved) { saved.setText("Прогресс сохранён").setColor("#5AF6B8"); retry.destroy(); }
                }
            });
        }
        new Button(this, {
            x: 630, y: 890, width: 300, height: 75, text: "Пройти заново", fontSize: 27,
            backgroundAlpha: 0, borderWidth: 1.5, borderColor: 0xa8a8a8,
            click: act(() => { SceneManager.startEpisode(this.scene.key, result.episodeId); })
        });
        new Button(this, {
            x: 960, y: 890, width: 300, height: 75, text: "На карту", fontSize: 27,
            backgroundAlpha: 0, borderWidth: 1.5, borderColor: 0xa8a8a8,
            click: act(() => SceneManager.showScene(this.scene.key, "ChapterMap"))
        });
        new Button(this, {
            x: 1290, y: 890, width: 300, height: 75,
            text: next ? "Дальше →" : "Главное меню", fontSize: 27,
            backgroundColor: 0xf2c94c, textColor: "#000000",
            click: act(() => {
                if (next?.heroAllowed) SceneManager.startEpisode(this.scene.key, next.id);
                else SceneManager.showScene(this.scene.key, next ? "ChapterMap" : "MainMenu");
            })
        });
        this.add.text(960, 995, next
            ? `Открыт эпизод ${["I", "II", "III", "IV"][next.id - 1]}: ${next.name}${next.heroAllowed ? "" : ` · нужен ${next.requiredHeroName}`}`
            : "Все эпизоды завершены. Можно улучшить результаты на карте.", {
            ...style, fontSize: "24px", color: "#A8A8A8"
        }).setOrigin(0.5);
    }
}
