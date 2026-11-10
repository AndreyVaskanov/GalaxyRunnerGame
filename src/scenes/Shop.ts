import Phaser from "phaser";
import SceneManager from "../managers/SceneManager";
import Button from "../ui/Button";
import { preloadHero, heroTexture } from "../characters/CharacterAssets";

export default class Shop extends Phaser.Scene {
    private returnTo = "MainMenu";

    constructor() { super("Shop"); }

    init(data: { returnTo?: string }): void {
        this.returnTo = data.returnTo === "CharacterSelect" || data.returnTo === "ChapterMap" ? data.returnTo : "MainMenu";
    }

    preload(): void {
        for (const hero of SceneManager.getCharacterCatalog()) preloadHero(this, hero.id, hero.sprite);
    }

    create(): void {
        this.cameras.main.setBackgroundColor("#080D17");
        const style = { fontFamily: "Rubik", fontSize: "27px", color: "#FFFFFF" };
        const leave = (to: string) => {
            this.input.setDefaultCursor("default");
            SceneManager.showScene(this.scene.key, to);
        };
        new Button(this, {
            x: 195, y: 65, width: 300, height: 55, variant: "back", text: "← Главное меню", fontSize: 24,
            backgroundAlpha: 0, textColor: "#F2C94C", click: () => leave("MainMenu")
        });
        if (this.returnTo !== "MainMenu") new Button(this, {
            x: 195, y: 125, width: 300, height: 55, variant: "back", text: "← Вернуться", fontSize: 24,
            backgroundAlpha: 0, textColor: "#A8A8A8", click: () => leave(this.returnTo)
        });
        this.add.text(960, 125, "МАГАЗИН", {
            fontFamily: "'Press Start 2P'", fontSize: "72px", color: "#F2C94C"
        }).setOrigin(0.5);
        const balance = this.add.text(1800, 65, "", { ...style, fontSize: "30px", color: "#5FD3FF" }).setOrigin(1, 0.5);
        this.add.text(960, 240, "ГЕРОИ", {
            fontFamily: "'Press Start 2P'", fontSize: "30px", color: "#FFFFFF"
        }).setOrigin(0.5);
        const cards = this.add.container();
        const status = this.add.text(960, 945, "", {
            ...style, fontSize: "25px", align: "center", wordWrap: { width: 1350 }
        }).setOrigin(0.5);
        const redraw = () => {
            cards.removeAll(true);
            balance.setText(`◆ ${SceneManager.getProgress().crystals}`);
            const progress = SceneManager.getProgress();
            SceneManager.getCharacterCatalog().forEach((hero, index) => {
                const x = 540 + index * 420;
                const owned = SceneManager.isCharacterOwned(hero.id);
                const unlocked = !hero.requiredEpisode || (progress.stars[String(hero.requiredEpisode)] ?? 0) >= 1;
                const background = this.add.graphics().fillStyle(0x0d172a);
                background.fillRoundedRect(x - 180, 295, 360, 590, 18);
                background.fillStyle(0x18243b).fillRoundedRect(x - 157.5, 317.5, 315, 255, 12);
                const preview = this.add.image(x, 450, heroTexture(hero.id), 0).setDisplaySize(168.75, 225);
                if (!unlocked && !owned) preview.setTint(0x000000);
                const name = this.add.text(x - 157.5, 600, hero.name, { ...style, fontSize: "33px", fontStyle: "bold" });
                const description = this.add.text(x - 157.5, 657,
                    `Бластер · урон ${hero.damage}.\n${hero.id === "kai" ? "Доступен с начала игры." : hero.id === "nova" ? "Самая быстрая." : "Покупка после эпизода III."}`, {
                        ...style, fontSize: "24px", wordWrap: { width: 315 }, lineSpacing: 8
                    });
                cards.add([background, preview, name, description]);
                if (owned || !unlocked) {
                    cards.add(this.add.text(x, 825, owned ? "Доступен" : "Откроется после\nэпизода III", {
                        ...style, fontSize: "24px", color: owned ? "#5AF6B8" : "#A8A8A8", align: "center"
                    }).setOrigin(0.5));
                } else {
                    const button = new Button(this, {
                        x, y: 825, width: 315, height: 70, text: `◆ ${hero.price} — купить`,
                        fontSize: 27, backgroundColor: 0xf2c94c, textColor: "#000000", click: () => {
                            const result = SceneManager.purchaseCharacter(hero.id);
                            status.setText(result.message).setColor(result.success ? "#5AF6B8" : "#FF9B9B");
                            this.input.setDefaultCursor("default");
                            redraw();
                        }
                    });
                    if (!SceneManager.canBuyCharacter(hero)) button.setAlpha(0.55);
                    cards.add(button);
                }
            });
        };
        redraw();
        new Button(this, {
            x: 1620, y: 1020, width: 420, height: 70, text: "Выбрать героя →", fontSize: 27,
            backgroundColor: 0xf2c94c, textColor: "#000000", click: () => leave("CharacterSelect")
        });
        this.add.text(90, 1020, "Покупки сохраняются при перезапуске эпизода.", {
            ...style, fontSize: "22px", color: "#A8A8A8"
        }).setOrigin(0, 0.5);
    }
}
