// Единственный компонент, обращающийся к LocalStorage.
export default class SaveSystem {
    public load<T>(key: string, validate: (value: unknown) => value is T, fallback: T): T {
        try {
            const raw = localStorage.getItem(`galaxy-runner:${key}`);
            if (raw === null) return structuredClone(fallback);
            const value: unknown = JSON.parse(raw);
            return validate(value) ? value : structuredClone(fallback);
        } catch {
            return structuredClone(fallback);
        }
    }

    public save(key: string, value: unknown): boolean {
        try {
            localStorage.setItem(`galaxy-runner:${key}`, JSON.stringify(value));
            return true;
        } catch {
            // Недоступное хранилище не останавливает игру.
            return false;
        }
    }
}
