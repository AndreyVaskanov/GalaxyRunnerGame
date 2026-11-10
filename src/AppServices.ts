import type Phaser from "phaser";
import SaveSystem from "./systems/SaveSystem";
import ProgressSystem from "./systems/ProgressSystem";
import AudioManager from "./managers/AudioManager";
import SettingsManager from "./managers/SettingsManager";
import CharacterShopManager from "./managers/CharacterShopManager";

// Общие компоненты приложения. Здесь только создание и связывание зависимостей.
const saves = new SaveSystem();
const audio = new AudioManager();
const settings = new SettingsManager(saves, audio);
const progress = new ProgressSystem(saves);
const characters = new CharacterShopManager(progress, saves);

export const appServices = { saves, audio, settings, progress, characters };

export function initializeServices(game: Phaser.Game): void {
    audio.initialize(game.sound);
    settings.load();
    progress.load();
    characters.load();
}
