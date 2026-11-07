export enum GameState {
    Play,
    Pause,
    Win,
    Lose
}

export default class GameManager {

    private state: GameState = GameState.Play;

    public getState(): GameState {
        return this.state;
    }

    public pause(): void {
        this.state = GameState.Pause
    }

    public resume(): void {
     this.state = GameState.Play;
    }

    public win(): void {
        this.state = GameState.Win;
    }

    public lose(): void {
        this.state = GameState.Lose;
    }
}