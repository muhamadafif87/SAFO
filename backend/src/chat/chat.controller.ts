import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatService } from './chat.service';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('orders/:orderId/conversation')
  getConversationByOrderId(
    @Request() req,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.chatService.getConversationByOrderId(orderId, {
      id: req.user.userId,
      role: req.user.role,
    });
  }

  @Get('conversations/:id')
  getConversationById(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatService.getConversationById(id, {
      id: req.user.userId,
      role: req.user.role,
    });
  }

  @Get('conversations/:id/messages')
  getMessages(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetMessagesQueryDto,
  ) {
    return this.chatService.getMessages(
      id,
      { id: req.user.userId, role: req.user.role },
      query,
    );
  }

  @Post('conversations/:id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  uploadAttachment(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.chatService.uploadAttachment(
      id,
      { id: req.user.userId, role: req.user.role },
      file,
    );
  }

  @Get('conversations/:id/attachments/:attachmentId/url')
  refreshAttachmentUrl(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    return this.chatService.refreshAttachmentUrl(
      id,
      attachmentId,
      { id: req.user.userId, role: req.user.role },
    );
  }

  @Post('messages')
  sendMessage(@Request() req, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(
      { id: req.user.userId, role: req.user.role },
      dto,
    );
  }
}
