import Phaser from "phaser";

export default class Ground extends Phaser.GameObjects.Rectangle {

    constructor(scene: Phaser.Scene, color: number, borderColor: number) {

        const height = 150
        const y = 1080 - height

        super(scene, 0, y, 1920, height, color)

        this.setOrigin(0)

        scene.add.existing(this)
        scene.physics.add.existing(this, true)

        let border = scene.add.rectangle(0, y, 1920, 10, borderColor)
        border.setOrigin(0)
    }
}