import { storage } from '@/utils/storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { ChatMessage, MessageAckPayload, SendMessagePayload } from '../types/chat';

const TOKEN_KEY_ACCESS = 'safo_access_token';

function getSocketBaseUrl(): string {
  if (Platform.OS !== 'web') {
    const host = Constants.expoConfig?.hostUri?.split(':')[0];
    if (host && host !== 'localhost') {
      return `http://${host}:3000`;
    }
  }
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';
  return apiUrl.replace(/\/api\/?$/, '');
}

class SocketService {
  private socket: Socket | null = null;
  private currentConversationId: string | null = null;

  async connect(): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    const token = await storage.getItemAsync(TOKEN_KEY_ACCESS);
    const baseUrl = getSocketBaseUrl();

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(`${baseUrl}/chat`, {
      transports: ['websocket'],
      auth: {
        token: token ? `Bearer ${token}` : '',
      },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      if (this.currentConversationId) {
        this.joinConversation(this.currentConversationId);
      }
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      if (this.currentConversationId) {
        this.leaveConversation(this.currentConversationId);
      }
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinConversation(conversationId: string): void {
    this.currentConversationId = conversationId;
    if (this.socket?.connected) {
      this.socket.emit('chat:join', { conversationId });
    }
  }

  leaveConversation(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('chat:leave', { conversationId });
    }
    if (this.currentConversationId === conversationId) {
      this.currentConversationId = null;
    }
  }

  onMessage(callback: (message: ChatMessage) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('chat:message', callback);
    return () => {
      this.socket?.off('chat:message', callback);
    };
  }

  sendMessage(payload: SendMessagePayload): Promise<MessageAckPayload> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        return reject(new Error('Socket is not connected'));
      }

      const timeout = setTimeout(() => {
        reject(new Error('Send message timed out'));
      }, 10000);

      this.socket.emit(
        'chat:send',
        payload,
        (response: { event: string; data: MessageAckPayload | { error: string } }) => {
          clearTimeout(timeout);
          if (response?.event === 'chat:error' || 'error' in (response?.data || {})) {
            const errMsg = (response?.data as any)?.error || 'Failed to send message';
            reject(new Error(errMsg));
          } else {
            resolve(response.data as MessageAckPayload);
          }
        },
      );
    });
  }
}

export const socketService = new SocketService();
