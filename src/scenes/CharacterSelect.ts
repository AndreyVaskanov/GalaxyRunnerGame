import Phaser from "phaser";
import SceneManager from "../managers/SceneManager";
import Button from "../ui/Button";
import { preloadHero, heroTexture } from "../characters/CharacterAssets";
import type { HeroDefinition } from "../interface/HeroDefinition";
import tokens from "../data/ui/tokens.json";

export default class CharacterSelect extends Phaser.Scene {
    constructor() { super("CharacterSelect"); }

    preload(): void {
        for (const hero of SceneManager.getCharacterCatalog()) preloadHero(this, hero.id, hero.sprite);
    }

    create(): void {
        this.cameras.main.setBackgroundColor(tokens.colors.background);
        const cx = this.scale.width / 2;
        const frames: { id: string; graphics: Phaser.GameObjects.Graphics; x: number; y: number }[] = [];
        this.add.text(cx, 135, "ВЫБЕРИ ГЕРОЯ", {
            fontFamily: "'Press Start 2P'", fontSize: "54px", color: tokens.colors.yellow_accent
        }).setOrigin(0.5);
        const status = this.add.text(cx, 850, "", {
            fontFamily: "Rubik", fontSize: "24px", color: tokens.colors.text_grey_blue,
            wordWrap: { width: 1200 }, align: "center"
        }).setOrigin(0.5);
        const redraw = () => {
            const selected = SceneManager.getCharacters().selected;
            for (const card of frames) {
                card.graphics.clear().lineStyle(3, card.id === selected ? 0xf2c94c : 0xa8a8a8);
                card.graphics.strokeRoundedRect(card.x - 187.5, card.y - 262.5, 375, 525, 15);
            }
        };
        const choose = (hero: HeroDefinition) => {
            if (!SceneManager.isCharacterOwned(hero.id)) return;
            const saved = SceneManager.selectCharacter(hero.id);
            redraw();
            status.setText(saved ? `${hero.name} выбран` : "Герой выбран. Сохранить выбор в браузере не удалось.");
        };

        SceneManager.getCharacterCatalog().forEach((hero, index) => {
            const x = cx + (index - 1) * 420;
            const y = 525;
            const owned = SceneManager.isCharacterOwned(hero.id);
            const background = this.add.graphics();
            background.fillStyle(0x141432).fillRoundedRect(x - 187.5, y - 262.5, 375, 525, 15);
            const preview = this.add.image(x, y - 112, heroTexture(hero.id), 0);
            preview.setDisplaySize(168.75, 225);
            if (!owned) preview.setTint(0x5a6178).setAlpha(0.55);
            this.add.text(x, y + 25, hero.name, { fontFamily: "Rubik", fontSize: "33px", color: "#FFFFFF" }).setOrigin(0.5);
            const stats: [string, number][] = [["Скорость", hero.speed], ["Прыжок", hero.jump], ["Атака", hero.attack]];
            stats.forEach(([label, value], row) => {
                this.add.text(x - 152, y + 63 + row * 39, label, {
                    fontFamily: "Rubik", fontSize: "24px", color: "#C8C8C8"
                });
                this.add.text(x + 152, y + 63 + row * 39, "★".repeat(value) + "☆".repeat(5 - value), {
                    fontFamily: "Rubik", fontSize: "25px", color: "#F2C94C"
                }).setOrigin(1, 0);
            });
            let availability = "Доступен";
            if (!owned) {
                const completedThird = (SceneManager.getProgress().stars["3"] ?? 0) >= 1;
                availability = hero.requiredEpisode && !completedThird
                    ? `После эпизода III · ${hero.price} кристаллов`
                    : `Покупка в магазине · ${hero.price} кристаллов`;
            }
            this.add.text(x, y + 222, availability, {
                fontFamily: "Rubik", fontSize: "19px", color: owned ? "#5AF6B8" : "#A8A8A8",
                align: "center", wordWrap: { width: 340 }
            }).setOrigin(0.5);
            const graphics = this.add.graphics();
            frames.push({ id: hero.id, graphics, x, y });
            if (owned) {
                const hitArea = this.add.zone(x, y, 375, 525).setInteractive({ useHandCursor: true });
                hitArea.on("pointerdown", () => choose(hero));
            }
        });
        redraw();
        new Button(this, {
            x: 190, y: 65, width: 280, height: 55, text: "← Главное меню", fontSize: 24,
            textColor: "#A8A8A8", backgroundAlpha: 0,
            click: () => { this.input.setDefaultCursor("default"); SceneManager.showScene(this.scene.key, "MainMenu"); }
        });
        new Button(this, {
            x: this.scale.width - 240, y: 970, width: 330, height: 75, text: "Выбрать →",
            fontSize: 27, backgroundColor: 0xf2c94c, textColor: "#000000",
            click: () => {
                this.input.setDefaultCursor("default");
                SceneManager.showScene(this.scene.key, "Desert1");
            }
        });
    }
}
