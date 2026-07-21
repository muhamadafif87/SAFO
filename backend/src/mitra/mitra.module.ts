import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MitraController } from './mitra.controller';
import { MitraService } from './mitra.service';
import { MitraProfile } from '../database/entities/mitra-profile.entity';
import { User } from '../database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MitraProfile, User])],
  controllers: [MitraController],
  providers: [MitraService],
  exports: [MitraService],
})
export class MitraModule {}
