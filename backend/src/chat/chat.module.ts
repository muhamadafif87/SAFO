import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../database/entities/conversation.entity';
import { MessageAttachment } from '../database/entities/message-attachment.entity';
import { Message } from '../database/entities/message.entity';
import { MitraProfile } from '../database/entities/mitra-profile.entity';
import { NotificationOutbox } from '../database/entities/notification-outbox.entity';
import { UserDevice } from '../database/entities/user-device.entity';
import { ChatStorageService } from './chat-storage.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { DeviceController } from './device.controller';
import { NotificationOutboxProcessor } from './notification-outbox.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      Message,
      MessageAttachment,
      NotificationOutbox,
      UserDevice,
      MitraProfile,
    ]),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'secret'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRATION', '15m') as any,
        },
      }),
    }),
  ],
  controllers: [ChatController, DeviceController],
  providers: [
    ChatService,
    ChatStorageService,
    ChatGateway,
    NotificationOutboxProcessor,
  ],
  exports: [ChatService],
})
export class ChatModule {}
