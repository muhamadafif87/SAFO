import { create } from 'zustand';
import { chatService } from '../services/chat.service';
import { socketService } from '../services/socket.service';
import { ChatMessage, Conversation, MessageType } from '../types/chat';

interface ChatState {
  conversation: Conversation | null;
  messages: ChatMessage[];
  isLoadingConversation: boolean;
  isLoadingMessages: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  nextCursor: { cursorCreatedAt: string; cursorId: string } | null;
  isUploadingAttachment: boolean;
  error: string | null;

  loadConversationByOrderId: (orderId: string) => Promise<Conversation | null>;
  loadMessages: (conversationId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  sendTextMessage: (
    content: string,
    currentUserId: string,
    currentUserRole: 'customer' | 'mitra',
  ) => Promise<void>;
  sendImageMessage: (
    fileUri: string,
    currentUserId: string,
    currentUserRole: 'customer' | 'mitra',
    fileName?: string,
    mimeType?: string,
  ) => Promise<void>;
  setupSocketListeners: () => () => void;
  cleanup: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversation: null,
  messages: [],
  isLoadingConversation: false,
  isLoadingMessages: false,
  isLoadingMore: false,
  hasMore: false,
  nextCursor: null,
  isUploadingAttachment: false,
  error: null,

  loadConversationByOrderId: async (orderId: string) => {
    set({ isLoadingConversation: true, error: null });
    try {
      const conversation = await chatService.getConversationByOrderId(orderId);
      set({ conversation, isLoadingConversation: false });

      // Join socket room
      await socketService.connect();
      socketService.joinConversation(conversation.id);

      // Fetch initial messages
      await get().loadMessages(conversation.id);

      return conversation;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Gagal memuat percakapan';
      set({ error: msg, isLoadingConversation: false });
      return null;
    }
  },

  loadMessages: async (conversationId: string) => {
    set({ isLoadingMessages: true });
    try {
      const res = await chatService.getMessages(conversationId, { limit: 25 });
      // API returns newest first (DESC). We reverse so messages are in chronological order
      const chronological = [...res.messages].reverse();
      set({
        messages: chronological,
        hasMore: res.hasMore,
        nextCursor: res.nextCursor,
        isLoadingMessages: false,
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || 'Gagal memuat riwayat pesan',
        isLoadingMessages: false,
      });
    }
  },

  loadMoreMessages: async () => {
    const { conversation, nextCursor, hasMore, isLoadingMore, messages } = get();
    if (!conversation || !hasMore || !nextCursor || isLoadingMore) return;

    set({ isLoadingMore: true });
    try {
      const res = await chatService.getMessages(conversation.id, {
        cursorCreatedAt: nextCursor.cursorCreatedAt,
        cursorId: nextCursor.cursorId,
        limit: 25,
      });

      const olderChronological = [...res.messages].reverse();
      set({
        messages: [...olderChronological, ...messages],
        hasMore: res.hasMore,
        nextCursor: res.nextCursor,
        isLoadingMore: false,
      });
    } catch (err) {
      set({ isLoadingMore: false });
    }
  },

  setupSocketListeners: () => {
    return socketService.onMessage((incoming: ChatMessage) => {
      const { conversation, messages } = get();
      if (!conversation || incoming.conversationId !== conversation.id) return;

      const existingIndex = messages.findIndex(
        (m) =>
          m.id === incoming.id ||
          (m.clientMessageId && m.clientMessageId === incoming.clientMessageId),
      );

      if (existingIndex !== -1) {
        const updated = [...messages];
        updated[existingIndex] = { ...incoming, isSending: false, isFailed: false };
        set({ messages: updated });
      } else {
        set({ messages: [...messages, incoming] });
      }
    });
  },

  sendTextMessage: async (
    content: string,
    currentUserId: string,
    currentUserRole: 'customer' | 'mitra',
  ) => {
    const { conversation, messages } = get();
    if (!conversation || !content.trim()) return;

    const clientMessageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMsg: ChatMessage = {
      id: clientMessageId,
      conversationId: conversation.id,
      senderId: currentUserId,
      senderRole: currentUserRole,
      clientMessageId,
      type: 'text' as MessageType,
      content: content.trim(),
      attachmentId: null,
      attachment: null,
      createdAt: new Date().toISOString(),
      isSending: true,
      isFailed: false,
    };

    set({ messages: [...messages, optimisticMsg] });

    try {
      const ack = await socketService.sendMessage({
        conversationId: conversation.id,
        clientMessageId,
        type: 'text' as MessageType,
        content: content.trim(),
      });

      // Update optimistic message with ack
      const currentMessages = get().messages;
      const index = currentMessages.findIndex((m) => m.clientMessageId === clientMessageId);
      if (index !== -1) {
        const updated = [...currentMessages];
        updated[index] = {
          ...updated[index],
          id: ack.messageId,
          createdAt: ack.createdAt,
          isSending: false,
          isFailed: false,
        };
        set({ messages: updated });
      }
    } catch (err) {
      // Fallback via REST
      try {
        const restResult = await chatService.sendMessageRest({
          conversationId: conversation.id,
          clientMessageId,
          type: 'text' as MessageType,
          content: content.trim(),
        });

        const currentMessages = get().messages;
        const index = currentMessages.findIndex((m) => m.clientMessageId === clientMessageId);
        if (index !== -1) {
          const updated = [...currentMessages];
          updated[index] = {
            ...updated[index],
            id: restResult.message.id,
            createdAt: restResult.message.createdAt,
            isSending: false,
            isFailed: false,
          };
          set({ messages: updated });
        }
      } catch (restErr) {
        const currentMessages = get().messages;
        const index = currentMessages.findIndex((m) => m.clientMessageId === clientMessageId);
        if (index !== -1) {
          const updated = [...currentMessages];
          updated[index] = { ...updated[index], isSending: false, isFailed: true };
          set({ messages: updated });
        }
      }
    }
  },

  sendImageMessage: async (
    fileUri: string,
    currentUserId: string,
    currentUserRole: 'customer' | 'mitra',
    fileName: string = 'chat_image.jpg',
    mimeType: string = 'image/jpeg',
  ) => {
    const { conversation, messages } = get();
    if (!conversation) return;

    set({ isUploadingAttachment: true });
    const clientMessageId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // 1. Upload attachment to backend & S3
    let uploadedAttachment;
    try {
      uploadedAttachment = await chatService.uploadAttachment(
        conversation.id,
        fileUri,
        fileName,
        mimeType,
      );
    } catch (uploadErr) {
      set({ isUploadingAttachment: false });
      return;
    } finally {
      set({ isUploadingAttachment: false });
    }

    // 2. Add optimistic image message
    const optimisticMsg: ChatMessage = {
      id: clientMessageId,
      conversationId: conversation.id,
      senderId: currentUserId,
      senderRole: currentUserRole,
      clientMessageId,
      type: 'image' as MessageType,
      content: null,
      attachmentId: uploadedAttachment.id,
      attachment: uploadedAttachment,
      createdAt: new Date().toISOString(),
      isSending: true,
      isFailed: false,
    };

    set({ messages: [...get().messages, optimisticMsg] });

    // 3. Send message payload
    try {
      const ack = await socketService.sendMessage({
        conversationId: conversation.id,
        clientMessageId,
        type: 'image' as MessageType,
        attachmentId: uploadedAttachment.id,
      });

      const currentMessages = get().messages;
      const index = currentMessages.findIndex((m) => m.clientMessageId === clientMessageId);
      if (index !== -1) {
        const updated = [...currentMessages];
        updated[index] = {
          ...updated[index],
          id: ack.messageId,
          createdAt: ack.createdAt,
          isSending: false,
          isFailed: false,
        };
        set({ messages: updated });
      }
    } catch (sendErr) {
      try {
        const restResult = await chatService.sendMessageRest({
          conversationId: conversation.id,
          clientMessageId,
          type: 'image' as MessageType,
          attachmentId: uploadedAttachment.id,
        });
        const currentMessages = get().messages;
        const index = currentMessages.findIndex((m) => m.clientMessageId === clientMessageId);
        if (index !== -1) {
          const updated = [...currentMessages];
          updated[index] = {
            ...updated[index],
            id: restResult.message.id,
            createdAt: restResult.message.createdAt,
            isSending: false,
            isFailed: false,
          };
          set({ messages: updated });
        }
      } catch (restErr) {
        const currentMessages = get().messages;
        const index = currentMessages.findIndex((m) => m.clientMessageId === clientMessageId);
        if (index !== -1) {
          const updated = [...currentMessages];
          updated[index] = { ...updated[index], isSending: false, isFailed: true };
          set({ messages: updated });
        }
      }
    }
  },

  cleanup: () => {
    const { conversation } = get();
    if (conversation) {
      socketService.leaveConversation(conversation.id);
    }
    set({
      conversation: null,
      messages: [],
      error: null,
      nextCursor: null,
      hasMore: false,
    });
  },
}));
