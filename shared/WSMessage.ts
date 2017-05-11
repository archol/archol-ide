
interface ArcholIdeService {
    emit: ArcholIdeMessaging,
    listen: {
        [event in keyof ArcholIdeMessaging]: {
            on(listener: ArcholIdeMessaging[event]): void
            off(listener: ArcholIdeMessaging[event]): void
            once(listener: ArcholIdeMessaging[event]): void
        }
    }
}


interface ArcholIdeMessaging {
    boot(): Promise<number>
}
