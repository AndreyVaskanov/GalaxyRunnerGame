import type Phaser from "phaser";
import kai from "../assets/sprites/hero_kai_sheet.png";
import nova from "../assets/sprites/hero_nova_sheet.png";
import taron from "../assets/sprites/hero_taron_sheet.png";
import { heroAnimation } from "./CharacterCatalog";

const sheets: Record<string, string> = {
    "hero_kai_sheet.png": kai, "hero_nova_sheet.png": nova, "hero_taron_sheet.png": taron
};

export function heroTexture(id: string): string { return `hero-${id}`; }

export function preloadHero(scene: Phaser.Scene, id: string, filename: string): void {
    const url = sheets[filename];
    if (!url) throw new Error(`Не найден спрайт героя: ${filename}`);
    const key = heroTexture(id);
    if (!scene.textures.exists(key)) scene.load.spritesheet(key, url, {
        frameWidth: heroAnimation.frameWidth, frameHeight: heroAnimation.frameHeight
    });
}
