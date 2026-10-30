import Phaser from "phaser";
import Ground from "../../gameObjects/Ground";

export default class BaseGameScene extends Phaser.Scene {

    constructor() {
        super("BaseGameScene")
    }

    create() : void {
    
        this.cameras.main.setBackgroundColor(0xFF00FF)

        let ground = new Ground(this, 0xF0F0FF, 0xFFF000)
    
    }

}