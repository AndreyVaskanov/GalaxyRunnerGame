import Phaser from "phaser";
import GameManager from "./GameManager";

export default class SceneManager {

    private static sceneManager: Phaser.Scenes.SceneManager
    private static gameManager: GameManager | null = null

    public static initialize (sceneManager: Phaser.Scenes.SceneManager) {
        SceneManager.sceneManager = sceneManager
    }

    public static setGameManager(gameManager: GameManager | null) {
        SceneManager.gameManager = gameManager
    }

    public static getSceneManager(): Phaser.Scenes.SceneManager {
        return SceneManager.sceneManager;
    }

    public static pauseGame() {
        if (this.gameManager === null) {
            return
        } 
        this.gameManager.pause()
    }

    public static resumeGame() {
        if(this.gameManager === null) {
            return
        }
        this.gameManager.resume()
    }

}
