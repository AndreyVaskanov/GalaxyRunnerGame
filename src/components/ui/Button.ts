import Phaser from "phaser";

interface ButtonConfig {

    x: number
    y: number
    width: number
    height: number

    text: string
    fontFamily?: string
    fontSize?: string
    textColor?: string

    backgroundColor?: number
    backgroundAlpha?: number
    radius?: number
    borderColor?: number
    borderRadius?: number

}

export default class Button extends Phaser.GameObjects.Container {

    constructor (scene: Phaser.Scene, config: ButtonConfig) {

        let x = config.x
        let y = config.y
        let width = config.width
        let height = config.height

        let text = config.text
        let fontFamily = config.fontFamily ?? "Rubik"
        let fontSize = config.fontSize ?? "20px"
        let textColor = config.textColor ?? "#FFFFFF"

        let backgroundColor = config.backgroundColor ?? 0xFFFFFF
        let backgroundAlpha = config.backgroundAlpha ?? 1
        let radius = config.radius ?? 8
        let borderColor = config.borderColor ?? 0xFFFFFF
        let borderRadius = config.borderRadius ?? 0

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

        let label = scene.add.text(0, 0, text)
        label.setFontFamily(fontFamily)
        label.setFontSize(fontSize)
        label.setColor(textColor)
        label.setOrigin(0.5)
        
        this.add([background, label])

        scene.add.existing(this)
    
    }

}