import Phaser from 'phaser';
import UIPlugin from 'phaser4-rex-plugins/templates/ui/ui-plugin'
import MainMenu from './scenes/MainMenu';
import ChapterMap from './scenes/ChapterMap';
import './style.css';
import Desert1 from './scenes/gameScenes/Desert1';

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

    scene: [MainMenu, ChapterMap, Desert1]
};

async function startGame() {

    await document.fonts.load("20px Rubik")
    await document.fonts.load("20px 'Press Start 2P'")

    new Phaser.Game(config)
}

startGame()
