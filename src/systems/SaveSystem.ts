interface PlayerProfile {
    version: 1;
    progress: unknown;
    characters: unknown;
}

function isProfile(value: unknown): value is PlayerProfile {
    return !!value && typeof value === "object" && "version" in value && value.version === 1
        && "progress" in value && "characters" in value;
}

// Единственный компонент, обращающийся к LocalStorage.
export default class SaveSystem {
    private getProfile(): PlayerProfile {
        // Первое сохранение профиля переносит оба прежних раздела одной записью.
        return this.load("profile", isProfile, {
            version: 1,
            progress: this.load<unknown>("progress", (_value): _value is unknown => true, null),
            characters: this.load<unknown>("characters", (_value): _value is unknown => true, null)
        });
    }

    public loadProfileData<T>(part: "progress" | "characters", validate: (value: unknown) => value is T, fallback: T): T {
        const value = this.getProfile()[part];
        return validate(value) ? structuredClone(value) : structuredClone(fallback);
    }

    public saveProfileData(part: "progress" | "characters", value: unknown): boolean {
        return this.save("profile", { ...this.getProfile(), [part]: value });
    }

    public savePurchase(progress: unknown, characters: unknown): boolean {
        return this.save("profile", { version: 1, progress, characters } satisfies PlayerProfile);
    }

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
