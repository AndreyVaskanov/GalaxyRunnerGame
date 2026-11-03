import Phaser from "phaser";
import Button from "../ui/Button";

export default class MainMenu extends Phaser.Scene {

    constructor() {
        super("MainMenu")
    }

    create() : void {

        this.cameras.main.setBackgroundColor("#080D17")

        //Отрисовка звезд
        const starsDrawer = this.add.graphics();
        starsDrawer.fillStyle(0xFFFFFF, 1)
        for (let i = 0; i < 100; i++) {
            const x = Phaser.Math.Between(0,1920)
            const y = Phaser.Math.Between(0,1080)
            const size = Phaser.Math.FloatBetween(0,1) < 0.7 ? 1 : 2
            const alpha = Phaser.Math.FloatBetween(0.5,1)
            starsDrawer.fillStyle(0xFFFFFF, alpha)
            starsDrawer.fillRect(x,y,size,size)
        }

        //Кнопки
        let buttonPlay = new Button(this, {
        width: 480,
        height: 90,
        fontSize: 30,
        text: "Играть",
        textColor: "#080D17",
        fontFamily: "Rubik",
        backgroundColor: 0xF2C94C,
        click: () => {
            this.scene.start("Desert1")
            this.input.setDefaultCursor("default");
            this.scene.stop("MainMenu")
        }})

        let buttonHowToPlay = new Button(this, {
            y: 130,
            width: 480,
            height: 90,
            fontSize: 27,
            text: "Как играть",
            backgroundAlpha: 0,
            borderWidth: 2,
            click: () => {
                this.scene.start("ChapterMap")
                this.scene.stop("MainMenu")
        }})

        let buttonShop = new Button(this, {
            y: 260,
            width: 480,
            height: 90,
            fontSize: 27,
            text: "Магазин",
            backgroundAlpha: 0,
            borderWidth: 2
        })

        let buttonSettings = new Button(this, {
            x: 0,
            y: 390,
            width: 480,
            height: 90,
            fontSize: 27,
            text: "Настройки",
            backgroundAlpha: 0,
            borderWidth: 2
        })

        let buttonContainer = this.add.container(960, 500)
        buttonContainer.add([buttonPlay, buttonHowToPlay, buttonShop, buttonSettings])

        //Надписи
        let smallHeader = this.add.text(960, 180, "ДАВНЫМ-ДАВНО, В ДАЛЁКОЙ ГАЛАКТИКЕ…")
        smallHeader.setOrigin(0.5)
        smallHeader.setFontSize(18)
        smallHeader.setFontFamily("'Press Start 2P'")

        let mainHeader = this.add.text(960, 260, "GALAXY RUNNER")
        mainHeader.setOrigin(0.5)
        mainHeader.setFontSize(72)
        mainHeader.setColor("#F2C94C")
        mainHeader.setFontFamily("'Press Start 2P'")

        let underHeader = this.add.text(960, 330, "Платформер в духе классики: беги, прыгай, сражайся")
        underHeader.setOrigin(0.5)
        underHeader.setFontSize(27)

    }
}