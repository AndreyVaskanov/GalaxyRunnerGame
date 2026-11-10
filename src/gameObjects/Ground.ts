import Phaser from "phaser";

export default class Ground extends Phaser.GameObjects.Rectangle {

    private border: Phaser.GameObjects.Rectangle

    constructor(scene: Phaser.Scene, width: number, height: number, y: number, color: number, borderColor: number) {

        super(scene, 0, y, width, height, color)

        this.setOrigin(0)

        scene.add.existing(this)
        scene.physics.add.existing(this, true)

        let border = scene.add.rectangle(0, y, width, 10, borderColor)
        this.border = border
        border.setOrigin(0)
    }

    destroy(fromScene?: boolean): void {
        this.border?.destroy(fromScene)
        super.destroy(fromScene)
    }
}
