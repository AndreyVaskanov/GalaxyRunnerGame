import Phaser from 'phaser';
import UIPlugin from 'phaser4-rex-plugins/templates/ui/ui-plugin'
import MainMenu from '../src/scenes/MainMenu';
import ChapterMap from '../src/scenes/ChapterMap';
import '../src/style.css';
import SceneManager from '../src/managers/SceneManager';
import Desert1 from '../src/scenes/gameScenes/Desert1';
import Ice2 from '../src/scenes/gameScenes/Ice2';
import Station3 from '../src/scenes/gameScenes/Station3';
import Junk4 from '../src/scenes/gameScenes/Junk4';
import Pause from '../src/scenes/Pause';
import CharacterSelect from '../src/scenes/CharacterSelect';
import EpisodeComplete from '../src/scenes/EpisodeComplete';
import GameOver from '../src/scenes/GameOver';
import Shop from '../src/scenes/Shop';
import Settings from '../src/scenes/Settings';
import HowToPlay from '../src/scenes/HowToPlay';
import { initializeServices } from '../src/AppServices';

export const config: Phaser.Types.Core.GameConfig = {

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
