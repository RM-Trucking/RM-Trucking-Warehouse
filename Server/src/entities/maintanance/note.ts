export interface NoteThread {
    noteThreadId: number;
    entityId: number;
    createdBy: number;
    createdAt: Date;
}

export interface NoteMessage {
    noteMessageId: number;
    noteThreadId: number;
    messageText: string;
    createdBy: number;
    createdAt: Date | null;
}

export interface NoteMessageRequest {
    messageText: string;
}

export interface NoteMessageResponse {
    noteMessageId: number;
    noteThreadId: number;
    messageText: string;
    createdAt: Date | null;
    createdBy: number;
    createdByName: string;
}
