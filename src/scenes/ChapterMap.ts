import Phaser from "phaser";
import Button from "../ui/Button";

export default class ChapterMap extends Phaser.Scene {

    constructor() {
        super("ChapterMap")
    }

    create() : void {

        this.cameras.main.setBackgroundColor("#080D17");

        let header = this.add.text(200, 50, "Карта эпизодов")
        header.setOrigin(0.5)
        header.setFontSize(30)
        
        let btnBack = new Button(this, {
            x:960,
            y:540,
            width: 300,
            height: 100,
            text: "Назад в меню",
            fontSize: 30,
            backgroundColor: 0xFF00FF,
            click: () => {
                this.scene.start("MainMenu")
                this.scene.stop("ChapterMap")
        }})
    }

}