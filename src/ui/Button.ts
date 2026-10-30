import Phaser from "phaser";

interface ButtonConfig {

    x?: number
    y?: number
    width: number
    height: number

    text: string
    fontFamily?: string
    fontSize?: number
    textColor?: string

    backgroundColor?: number
    backgroundAlpha?: number
    radius?: number
    borderColor?: number
    borderRadius?: number
    borderWidth?: number
    borderAlpha?: number

    click?: () => void

}

export default class Button extends Phaser.GameObjects.Container {

    constructor (scene: Phaser.Scene, config: ButtonConfig) {

        let x = config.x ?? 0
        let y = config.y ?? 0
        let width = config.width
        let height = config.height

        let text = config.text
        let fontFamily = config.fontFamily ?? "Rubik"
        let fontSize = config.fontSize ?? 20
        let textColor = config.textColor ?? "#FFFFFF"

        let backgroundColor = config.backgroundColor ?? 0x000000
        let backgroundAlpha = config.backgroundAlpha ?? 1
        let radius = config.radius ?? 12
        let borderColor = config.borderColor ?? 0xFFFFFF
        let borderAlpha = config.borderAlpha ?? 1
        let borderWidth = config.borderWidth ?? 0

        let click = config.click

        super (scene, x, y )

        let background = scene.add.graphics()

        background.fillStyle(backgroundColor, backgroundAlpha)
        background.fillRoundedRect(
            -width / 2, 
            -height / 2,
            width,
            height,
            radius
        )

        background.lineStyle(borderWidth, borderColor, borderAlpha)
        background.strokeRoundedRect(
            -width / 2, 
            -height / 2,
            width,
            height,
            radius
        )

        let label = scene.add.text(0, 0, text)
        label.setFontFamily(fontFamily)
        label.setFontSize(fontSize)
        label.setColor(textColor)
        label.setOrigin(0.5)
        
        this.add([background, label])

        this.setInteractive(new Phaser.Geom.Rectangle (
            -width / 2, 
            -height / 2,
            width,
            height,
        ), Phaser.Geom.Rectangle.Contains)

        this.on("pointerover", () => {
            scene.input.setDefaultCursor("pointer");
        });

        this.on("pointerout", () => {
            scene.input.setDefaultCursor("default");
        });

        this.on("pointerdown", () => {
            click?.()
        })

        scene.add.existing(this)
    
    }
    

}