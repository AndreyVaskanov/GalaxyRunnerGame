import GameScene from "../GameScene";
import type { SceneConfig } from "../../interface/SceneConfig";

const sceneConfig: SceneConfig = {

    backgroundColor: 0xffc17a,
    groundColor: 0xa86b00,
    groundBorderColor: 0x754a00,
    heroX: 500,
    heroY: 500,

    platforms: [
        {
            x: 700,
            y: 650,
            width: 400,
            height: 30,
            mainColor: 0xa86b00,
            secondaryColor: 0x754a00,
            typeMain: true
        },
        {
            x: 1200,
            y: 800,
            width: 300,
            height: 30,
            mainColor: 0xa86b00,
            secondaryColor: 0x754a00,
            typeMain: true
        },
        {
            x: 600,
            y: 830,
            width: 60,
            height: 100,
            mainColor: 0xa86b00,
            secondaryColor: 0x754a00,
            typeMain: false
        }
    ]
}

export default class Desert1 extends GameScene {

    constructor() {
        super("Desert1", sceneConfig)
    }

}