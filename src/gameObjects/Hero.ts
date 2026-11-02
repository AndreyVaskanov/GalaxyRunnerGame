import Phaser from "phaser"

export default class Hero {

    private body!: Phaser.Physics.Arcade.Body
    
    public getBody(): Phaser.Physics.Arcade.Body {
        return this.body
    }

    constructor(scene: Phaser.Scene, x: number, y: number) {

        const sprite = scene.add.sprite(x, y, "hero")
        scene.physics.add.existing(sprite)
        this.body = sprite.body as Phaser.Physics.Arcade.Body
        this.body.setCollideWorldBounds()

    }

    setSpeedX(speed: number) {
        this.body.setVelocityX(speed)
    }

    jump(speed: number) {
        if (this.body.onFloor()) {
            this.body.setVelocityY(-speed)
        }
    }

}