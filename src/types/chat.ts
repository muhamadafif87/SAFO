export type ConversationStatus = 'waiting' | 'active' | 'closed';

export type MessageType = 'text' | 'image';

export interface MessageAttachment {
  id: string;
  storageKey?: string;
  mimeType: string;
  fileSize: number;
  originalName: string;
  signedUrl?: string;
  expiresAt?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: 'customer' | 'mitra';
  clientMessageId: string;
  type: MessageType;
  content: string | null;
  attachmentId?: string | null;
  attachment?: MessageAttachment | null;
  createdAt: string;
  isSending?: boolean;
  isFailed?: boolean;
}

export interface ConversationParticipant {
  id: string;
  name: string;
  phone?: string;
  photoUrl?: string;
}

export interface MitraDetails {
  id: string;
  userId: string;
  businessName: string;
  category: string;
  address: string;
  photoUrl?: string;
  user?: ConversationParticipant;
}

export interface Conversation {
  id: string;
  orderId: string;
  customerId: string;
  mitraId: string;
  status: ConversationStatus;
  startedAt?: string | null;
  closedAt?: string | null;
  closeReason?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: string;
    status: string;
    totalAmount: number;
    pickupCode?: string;
  };
  customer?: ConversationParticipant;
  mitra?: MitraDetails;
}

export interface SendMessagePayload {
  conversationId: string;
  clientMessageId: string;
  type: MessageType;
  content?: string;
  attachmentId?: string;
}

export interface MessageAckPayload {
  clientMessageId: string;
  status: 'sent';
  messageId: string;
  isDuplicate: boolean;
  createdAt: string;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
  nextCursor: { cursorCreatedAt: string; cursorId: string } | null;
  hasMore: boolean;
}
