import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: string;
      email: string;
      role: string;
    };
  };
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const authHeader =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization;

      if (!authHeader) {
        this.logger.warn(`Connection rejected: Missing auth token (socket ${client.id})`);
        client.disconnect(true);
        return;
      }

      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

      const payload = this.jwtService.verify(token);
      client.data = {
        user: {
          id: payload.sub,
          email: payload.email,
          role: payload.role,
        },
      };

      this.logger.log(
        `Socket connected: ${client.id} (user: ${payload.sub}, role: ${payload.role})`,
      );
    } catch (error) {
      this.logger.warn(`Auth failed on socket ${client.id}: ${error.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat:join')
  async handleJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string },
  ) {
    if (!payload?.conversationId) {
      throw new WsException('conversationId is required');
    }

    try {
      const conversation = await this.chatService.getConversationById(
        payload.conversationId,
        client.data.user,
      );

      const roomName = `conversation:${conversation.id}`;
      await client.join(roomName);

      return {
        event: 'chat:joined',
        data: { conversationId: conversation.id, status: conversation.status },
      };
    } catch (error) {
      throw new WsException(error.message || 'Failed to join conversation room');
    }
  }

  @SubscribeMessage('chat:leave')
  async handleLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string },
  ) {
    if (!payload?.conversationId) return;
    const roomName = `conversation:${payload.conversationId}`;
    await client.leave(roomName);
    return {
      event: 'chat:left',
      data: { conversationId: payload.conversationId },
    };
  }

  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @SubscribeMessage('chat:send')
  async handleSend(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: SendMessageDto,
  ) {
    try {
      const result = await this.chatService.sendMessage(client.data.user, dto);
      const roomName = `conversation:${result.conversation.id}`;

      // Acknowledge sender first
      const ackPayload = {
        clientMessageId: dto.clientMessageId,
        status: 'sent',
        messageId: result.message.id,
        isDuplicate: result.isDuplicate,
        createdAt: result.message.createdAt,
      };

      // Broadcast to room if not a duplicate
      if (!result.isDuplicate) {
        this.server.to(roomName).emit('chat:message', {
          id: result.message.id,
          conversationId: result.message.conversationId,
          senderId: result.message.senderId,
          senderRole: result.message.senderRole,
          clientMessageId: result.message.clientMessageId,
          type: result.message.type,
          content: result.message.content,
          attachmentId: result.message.attachmentId,
          attachment: result.message.attachment
            ? {
                id: result.message.attachment.id,
                signedUrl: result.message.attachment.signedUrl,
                originalName: result.message.attachment.originalName,
                mimeType: result.message.attachment.mimeType,
                fileSize: result.message.attachment.fileSize,
              }
            : null,
          createdAt: result.message.createdAt,
        });
      }

      return {
        event: 'chat:message_ack',
        data: ackPayload,
      };
    } catch (error) {
      this.logger.error(`Failed to handle chat:send: ${error.message}`, error.stack);
      return {
        event: 'chat:error',
        data: {
          clientMessageId: dto.clientMessageId,
          error: error.message || 'Failed to send message',
        },
      };
    }
  }
}
