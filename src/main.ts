import Phaser from 'phaser';
import UIPlugin from 'phaser4-rex-plugins/templates/ui/ui-plugin'
import MainMenu from './scenes/MainMenu';
import ChapterMap from './scenes/ChapterMap';
import './style.css';
import SceneManager from './managers/SceneManager';
import Desert1 from './scenes/gameScenes/Desert1';
import Ice2 from './scenes/gameScenes/Ice2';
import Station3 from './scenes/gameScenes/Station3';
import Junk4 from './scenes/gameScenes/Junk4';
import Pause from './scenes/Pause';
import CharacterSelect from './scenes/CharacterSelect';
import EpisodeComplete from './scenes/EpisodeComplete';
import GameOver from './scenes/GameOver';
import Shop from './scenes/Shop';
import Settings from './scenes/Settings';
import HowToPlay from './scenes/HowToPlay';
import { initializeServices } from './AppServices';

const config: Phaser.Types.Core.GameConfig = {

    plugins: {
        scene: [
            {
                key: "rexUI",
                plugin: UIPlugin,
                mapping: "rexUI"
            }
        ]
    },

    parent: "app",

    type: Phaser.AUTO,
    pixelArt: true,

    callbacks: {
        preBoot: (game: Phaser.Game) => {
            initializeServices(game);
            SceneManager.initialize(game.scene);
        }
    },

    width: 1920,
    height: 1080,

    physics: {
        default: "arcade",
        arcade: {
            gravity: {
                x: 0,
                y: 1800
            },
            debug: false
        }
    },

    backgroundColor: '#080D17',

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },

    scene: [MainMenu, ChapterMap, CharacterSelect, Shop, Settings, HowToPlay, Desert1, Ice2, Station3, Junk4, Pause, EpisodeComplete, GameOver]
};

async function startGame() {

    await document.fonts.load("20px Rubik")
    await document.fonts.load("20px 'Press Start 2P'")

    new Phaser.Game(config)
}

startGame()
