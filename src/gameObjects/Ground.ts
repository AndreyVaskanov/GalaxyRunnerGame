import Phaser from "phaser";

export default class Ground extends Phaser.GameObjects.Container {

    constructor(scene: Phaser.Scene, color: number, borderColor: number) {

        let height = 150

        super(scene, 0, 1080-height);

        let body = scene.add.rectangle(0, 0, 1920, height, color)
        body.setOrigin(0)
        let border = scene.add.rectangle(0, 0, 1920, 10, borderColor)
        border.setOrigin(0)

        this.add([body, border]);

        scene.add.existing(this);
    }
}