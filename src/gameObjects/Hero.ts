import Phaser from "phaser"
import { heroTexture } from "../characters/CharacterAssets";
import { heroAnimation } from "../characters/CharacterCatalog";

export default class Hero {

    private body!: Phaser.Physics.Arcade.Body
    private sprite: Phaser.GameObjects.Sprite
    private readonly runAnimation: string;
    
    public getBody(): Phaser.Physics.Arcade.Body {
        return this.body
    }

    constructor(scene: Phaser.Scene, x: number, y: number, characterId: string) {

        const texture = heroTexture(characterId);
        const sprite = scene.add.sprite(x, y, texture, heroAnimation.idleFrame).setScale(heroAnimation.scale);
        this.runAnimation = `${texture}-run`;
        if (!scene.anims.exists(this.runAnimation)) {
            scene.anims.create({
                key: this.runAnimation,
                frames: scene.anims.generateFrameNumbers(texture, { start: heroAnimation.runStart, end: heroAnimation.runEnd }),
                frameRate: heroAnimation.runFps, repeat: -1
            });
        }
        this.sprite = sprite
        scene.physics.add.existing(sprite)
        this.body = sprite.body as Phaser.Physics.Arcade.Body
        this.body.setCollideWorldBounds()

    }

    setSpeedX(speed: number) {
        this.body.setVelocityX(speed)
        if (speed !== 0) this.sprite.setFlipX(speed < 0);
    }

    updateAnimation(): void {
        if (!this.body.onFloor() || this.body.velocity.y !== 0) {
            this.sprite.anims.stop();
            this.sprite.setFrame(heroAnimation.jumpFrame);
        } else if (this.body.velocity.x !== 0) {
            this.sprite.play(this.runAnimation, true);
        } else {
            this.sprite.anims.stop();
            this.sprite.setFrame(heroAnimation.idleFrame);
        }
    }

    jump(speed: number) {
        if (this.body.onFloor()) {
            this.body.setVelocityY(-speed)
        }
    }

    destroy(): void {
        this.sprite.destroy()
    }

}
