import { api } from './api';
import {
  ChatHistoryResponse,
  Conversation,
  MessageAttachment,
  SendMessagePayload,
} from '../types/chat';

export const chatService = {
  /**
   * Get conversation details for an order
   */
  getConversationByOrderId: async (orderId: string): Promise<Conversation> => {
    const res = await api.get<Conversation>(`/chat/orders/${orderId}/conversation`);
    return res.data;
  },

  /**
   * Get conversation by ID
   */
  getConversationById: async (conversationId: string): Promise<Conversation> => {
    const res = await api.get<Conversation>(`/chat/conversations/${conversationId}`);
    return res.data;
  },

  /**
   * Get messages with cursor pagination
   */
  getMessages: async (
    conversationId: string,
    params?: { cursorCreatedAt?: string; cursorId?: string; limit?: number },
  ): Promise<ChatHistoryResponse> => {
    const res = await api.get<ChatHistoryResponse>(
      `/chat/conversations/${conversationId}/messages`,
      { params },
    );
    return res.data;
  },

  /**
   * Upload an image attachment
   */
  uploadAttachment: async (
    conversationId: string,
    fileUri: string,
    fileName: string = 'image.jpg',
    mimeType: string = 'image/jpeg',
  ): Promise<MessageAttachment> => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);

    const res = await api.post<MessageAttachment>(
      `/chat/conversations/${conversationId}/attachments`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return res.data;
  },

  /**
   * Fallback REST message send
   */
  sendMessageRest: async (payload: SendMessagePayload) => {
    const res = await api.post('/chat/messages', payload);
    return res.data;
  },

  /**
   * Register push notification device token
   */
  registerDevice: async (pushToken: string, devicePlatform?: string) => {
    const res = await api.post('/notifications/devices', {
      pushToken,
      devicePlatform,
    });
    return res.data;
  },
};
