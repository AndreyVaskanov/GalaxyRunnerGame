import Phaser from "phaser";
import Ground from "../../gameObjects/Ground";
import Hero from "../../gameObjects/Hero";

export default class BaseGameScene extends Phaser.Scene {

    private hero!: Hero
    private keys!: Record<string, Phaser.Input.Keyboard.Key>

    constructor() {
        super("BaseGameScene") 
    }

    preload(): void {
        this.load.image("hero", "/src/assets/hero.png");
    }

    create() : void {
    
        this.cameras.main.setBackgroundColor(0xffc17a)

        const topic = this.add.rectangle(0, 0, 1920, 90, 0x080D17, 0.8)
        topic.setOrigin(0)

        const ground = new Ground(this, 0xa86b00, 0x754a00)
        this.hero = new Hero(this, 500, 500)

        this.physics.add.collider(ground, this.hero.getBody())

        this.keys = this.input.keyboard!.addKeys("A,D,W,SPACE") as Record<string, Phaser.Input.Keyboard.Key>

    }

    update(time: number, delta: number): void {

        let speedX = 0

        if (this.keys.A.isDown){
            speedX -= 300
        }
        if (this.keys.D.isDown) {
            speedX += 300
        }

        this.hero.setSpeedX(speedX)

        if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.W)) {
            this.hero.jump(800)
        }
    }

}