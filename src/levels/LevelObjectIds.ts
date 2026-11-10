export function crystalId(episodeId: number, screenIndex: number, index: number): string {
    return `${episodeId}:${screenIndex}:crystal:${index}`;
}

export function checkpointId(episodeId: number, screenIndex: number): string {
    return `${episodeId}:${screenIndex}:checkpoint`;
}
