import Phaser from "phaser";
import type { PlatformConfig } from "../interface/PlatformConfig";

export default class Platform extends Phaser.GameObjects.Rectangle {

    private border!: Phaser.GameObjects.Rectangle

    constructor(scene: Phaser.Scene, config: PlatformConfig) {

        super(scene, config.x, config.y, config.width, config.height, config.mainColor)

        this.setOrigin(0)

        scene.add.existing(this)
        scene.physics.add.existing(this, true)

        const borderSize = 10

        if (config.typeMain) {

            this.border = scene.add.rectangle(config.x,
                config.y + config.height - borderSize,
                config.width,
                borderSize,
                config.secondaryColor
            )

        } else {

            this.border = scene.add.rectangle(
                config.x + config.width - borderSize,
                config.y,
                borderSize,
                config.height,
                config.secondaryColor
            )

        }

        this.border.setOrigin(0)
    }
}
