import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { MessageType } from '../../database/entities/chat.enums';

export class SendMessageDto {
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  clientMessageId: string;

  @IsEnum(MessageType)
  type: MessageType;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  content?: string;

  @IsOptional()
  @IsUUID()
  attachmentId?: string;
}
