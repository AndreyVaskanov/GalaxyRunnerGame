import Phaser from 'phaser';
import MainMenu from './scenes/MainMenu';
import './style.css';

const config: Phaser.Types.Core.GameConfig = {

    type: Phaser.AUTO,

    width: 1280,
    height: 720,

    parent: 'app',
    backgroundColor: '#080D17',

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },

    scene: [MainMenu]
};

const game = new Phaser.Game(config);
