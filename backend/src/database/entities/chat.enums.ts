export enum ConversationStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  CLOSED = 'closed',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
}

export enum AttachmentStatus {
  UPLOADED = 'uploaded',
  ATTACHED = 'attached',
  DELETED = 'deleted',
}

export enum OutboxStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DEAD = 'dead',
}
