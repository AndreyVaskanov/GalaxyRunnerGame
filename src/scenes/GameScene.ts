import Phaser from "phaser";
import Ground from "../gameObjects/Ground";
import Hero from "../gameObjects/Hero";
import type { SceneConfig } from "../interface/SceneConfig";
import Platform from "../gameObjects/Platform";
import hero from "/src/assets/hero.png"

export default class GameScene extends Phaser.Scene {

    private hero!: Hero
    private keys!: Record<string, Phaser.Input.Keyboard.Key>

    private config: SceneConfig

    constructor(key: string, config: SceneConfig) {
        super(key) 
        this.config = config
    }

    preload(): void {
        this.load.image("hero", hero);
    }

    create() : void {
    
        this.cameras.main.setBackgroundColor(this.config.backgroundColor)

        const topic = this.add.rectangle(0, 0, 1920, 90, 0x080D17, 0.8)
        topic.setOrigin(0)

        const ground = new Ground(this, this.config.groundColor, this.config.groundBorderColor)
        this.hero = new Hero(this, this.config.heroX, this.config.heroY)

        this.physics.add.collider(ground, this.hero.getBody())

        this.keys = this.input.keyboard!.addKeys("A,D,W,SPACE") as Record<string, Phaser.Input.Keyboard.Key>

        for (const platformConfig of this.config.platforms) {
            let platform = new Platform(this, platformConfig)
            this.physics.add.collider(this.hero.getBody(), platform)
        }

    }

    update(): void {

        let speedX = 0

        if (this.keys.A.isDown){
            speedX -= 300
        }
        if (this.keys.D.isDown) {
            speedX += 300
        }

        this.hero.setSpeedX(speedX)

        if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.W)) {
            this.hero.jump(850)
        }
    }

}