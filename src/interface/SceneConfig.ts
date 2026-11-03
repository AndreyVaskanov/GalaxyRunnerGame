import type { PlatformConfig } from "./PlatformConfig";

export interface SceneConfig {

    backgroundColor: number
    groundColor: number
    groundBorderColor: number
    heroX: number
    heroY: number

    platforms: PlatformConfig[]

}