import Phaser from "phaser";
import Ground from "../gameObjects/Ground";
import Hero from "../gameObjects/Hero";
import type { SceneConfig } from "../interface/SceneConfig";
import Platform from "../gameObjects/Platform";
import hero from "/src/assets/hero.png"
import GameManager from "../managers/GameManager";
import { GameState } from "../managers/GameManager";
import SceneManager from "../managers/SceneManager";

export default abstract class GameScene extends Phaser.Scene {

    private hero!: Hero
    private keys!: Record<string, Phaser.Input.Keyboard.Key>
    private config: SceneConfig
    private gameManager!: GameManager

    constructor(key: string, config: SceneConfig) {
        super(key) 
        this.config = config
    }

    preload(): void {
        this.load.image("hero", hero);
    }

    create() : void {

        this.gameManager = new GameManager()

        SceneManager.setGameManager (this.gameManager)
        this.events.once (Phaser.Scenes.Events.SHUTDOWN, () => {SceneManager.setGameManager(null)})
    
        this.cameras.main.setBackgroundColor(this.config.backgroundColor)

        const topic = this.add.rectangle(0, 0, 1920, 90, 0x080D17, 0.8)
        topic.setOrigin(0)

        const ground = new Ground(this, this.config.groundColor, this.config.groundBorderColor)
        this.hero = new Hero(this, this.config.heroX, this.config.heroY)

        this.physics.add.collider(ground, this.hero.getBody())

        this.keys = this.input.keyboard!.addKeys("A,D,W,SPACE,ESC") as Record<string, Phaser.Input.Keyboard.Key>

        for (const platformConfig of this.config.platforms) {
            let platform = new Platform(this, platformConfig)
            this.physics.add.collider(this.hero.getBody(), platform)
        }

    }

    update(): void {

        if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {

            if (this.gameManager.getState() == GameState.Play) {

                SceneManager.pauseGame()

            } else if (this.gameManager.getState() == GameState.Pause) {

                SceneManager.resumeGame()
            }
        }

        if (this.gameManager.getState() !== GameState.Play) {
            this.physics.pause()
            return
        }

        if (this.physics.world.isPaused) {
            this.physics.resume()
        }

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