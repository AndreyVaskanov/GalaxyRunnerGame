import Phaser from "phaser";
import SceneManager from "../managers/SceneManager";
import type { UiSoundKey } from "../config/SoundEffects";

interface ButtonConfig {

    x?: number
    y?: number
    width: number
    height: number

    text: string
    variant?: "back" | "outline"
    /** Тип звука; false — звук определяется результатом обработчика. */
    sound?: UiSoundKey | false
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

        const isBack = config.variant === "back"
        const isOutlined = isBack || config.variant === "outline"
        let text = isBack ? config.text.replace(/^←\s*/, "") : config.text
        let fontFamily = config.fontFamily ?? "Rubik"
        let fontSize = config.fontSize ?? 20
        let textColor = config.textColor ?? (isBack ? "#DCE5F2" : "#FFFFFF")

        let backgroundColor = isOutlined ? 0x080d17 : config.backgroundColor ?? 0x000000
        let backgroundAlpha = isOutlined ? 1 : config.backgroundAlpha ?? 1
        let radius = config.radius ?? 12
        let borderColor = isOutlined ? 0x3b4c65 : config.borderColor ?? 0xFFFFFF
        let borderAlpha = config.borderAlpha ?? 1
        let borderWidth = isOutlined ? 2 : config.borderWidth ?? 0

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

        // Отдельный замкнутый контур: верхняя грань не зависит от пути заливки.
        if (borderWidth > 0) {
            const left = -width / 2 + borderWidth / 2
            const right = width / 2 - borderWidth / 2
            const top = -height / 2 + borderWidth / 2
            const bottom = height / 2 - borderWidth / 2
            const r = Math.max(0, Math.min(radius, (right - left) / 2, (bottom - top) / 2))
            background.lineStyle(borderWidth, borderColor, borderAlpha).beginPath()
            background.moveTo(left + r, top).lineTo(right - r, top)
            background.arc(right - r, top + r, r, -Math.PI / 2, 0)
            background.lineTo(right, bottom - r).arc(right - r, bottom - r, r, 0, Math.PI / 2)
            background.lineTo(left + r, bottom).arc(left + r, bottom - r, r, Math.PI / 2, Math.PI)
            background.lineTo(left, top + r).arc(left + r, top + r, r, Math.PI, Math.PI * 1.5)
            background.closePath().strokePath()
        }

        const hover = scene.add.graphics().fillStyle(0xffffff, 0.07)
        hover.fillRoundedRect(-width / 2, -height / 2, width, height, radius).setVisible(false)

        let label = scene.add.text(isBack ? 12 : 0, 0, text)
        label.setFontFamily(fontFamily)
        label.setFontSize(fontSize)
        label.setColor(textColor)
        label.setOrigin(0.5)
        
        this.add([background, hover, label])
        if (isBack) {
            const arrow = scene.add.graphics().lineStyle(2.5, 0xf2c94c)
            const arrowX = -width / 2 + 28
            arrow.beginPath().moveTo(arrowX + 5, -7).lineTo(arrowX - 2, 0).lineTo(arrowX + 5, 7).strokePath()
            this.add(arrow)
        }

        this.setInteractive(new Phaser.Geom.Rectangle (
            -width / 2, 
            -height / 2,
            width,
            height,
        ), Phaser.Geom.Rectangle.Contains)

        this.on("pointerover", () => {
            hover.setVisible(true)
            scene.input.setDefaultCursor("pointer");
        });

        this.on("pointerout", () => {
            hover.setVisible(false)
            scene.input.setDefaultCursor("default");
        });

        this.on("pointerdown", () => {
            if (!click) return;
            const sound = config.sound ?? (isBack ? "uiBack" : "uiNavigate");
            if (sound !== false) SceneManager.playUiSound(sound);
            click?.()
        })

        scene.add.existing(this)
    
    }
    

}
