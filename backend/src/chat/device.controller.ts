import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Request,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDevice } from '../database/entities/user-device.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Controller('notifications')
export class DeviceController {
  constructor(
    @InjectRepository(UserDevice)
    private readonly deviceRepo: Repository<UserDevice>,
  ) {}

  @Post('devices')
  async registerDevice(@Request() req, @Body() dto: RegisterDeviceDto) {
    const userId = req.user.userId;

    let device = await this.deviceRepo.findOne({
      where: { pushToken: dto.pushToken },
    });

    if (device) {
      device.userId = userId;
      device.isActive = true;
      device.devicePlatform = dto.devicePlatform || device.devicePlatform;
      device.lastSeenAt = new Date();
    } else {
      device = this.deviceRepo.create({
        userId,
        pushToken: dto.pushToken,
        devicePlatform: dto.devicePlatform || null,
        isActive: true,
        lastSeenAt: new Date(),
      });
    }

    return this.deviceRepo.save(device);
  }

  @Delete('devices/:pushToken')
  async unregisterDevice(@Param('pushToken') pushToken: string) {
    await this.deviceRepo.update({ pushToken }, { isActive: false });
    return { success: true };
  }
}
