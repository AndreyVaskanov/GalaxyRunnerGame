import Phaser from 'phaser';
import UIPlugin from 'phaser4-rex-plugins/templates/ui/ui-plugin'
import MainMenu from './scenes/MainMenu';
import ChapterMap from './scenes/ChapterMap';
import './style.css';
import BaseGameScene from './scenes/gameScenes/BaseGameScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,

    width: 1920,
    height: 1080,

    parent: "app",

    plugins: {
        scene: [
            {
                key: "rexUI",
                plugin: UIPlugin,
                mapping: "rexUI"
            }
        ]
    },

    backgroundColor: '#080D17',

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },

    scene: [MainMenu, ChapterMap, BaseGameScene]
};

async function startGame() {

    await document.fonts.load("20px Rubik")
    await document.fonts.load("20px 'Press Start 2P'")

    const game = new Phaser.Game(config)
}

startGame()
