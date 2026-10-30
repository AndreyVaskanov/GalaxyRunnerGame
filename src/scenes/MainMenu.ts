import Phaser from "phaser";
import Button from "../components/ui/Button";

export default class MainMenu extends Phaser.Scene {

    constructor() {
        super("MainMenu")
    }

    create() : void {

        console.log("Проверка")

        this.cameras.main.setBackgroundColor("#080D17")

        const starsDrawer = this.add.graphics();
        starsDrawer.fillStyle(0xFFFFFF, 1)

        for (let i = 0; i < 300; i++) {
            const x = Phaser.Math.Between(0,1920)
            const y = Phaser.Math.Between(0,1080)
            const size = Phaser.Math.FloatBetween(0,1) < 0.7 ? 1 : 2
            const alpha = Phaser.Math.FloatBetween(0.5,1)
            starsDrawer.fillStyle(0xFFFFFF, alpha)
            starsDrawer.fillRect(x,y,size,size)
        }

        let playButton = new Button(this, {
        x: 960,
        y: 540,
        width: 320,
        height: 60,
            
        text: "ИГРАТЬ",
        textColor: "#080D17",
            
        backgroundColor: 0xF2C94C
});

    }
}