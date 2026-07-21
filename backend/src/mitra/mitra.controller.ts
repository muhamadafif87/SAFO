import { Controller, Get, Patch, Body, Param, Query, Request } from '@nestjs/common';
import { MitraService } from './mitra.service';
import { UpdateMitraProfileDto } from './dto/update-mitra-profile.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities/user.entity';
import { VerificationStatus } from '../database/entities/mitra-profile.entity';

@Controller('mitra')
export class MitraController {
  constructor(private readonly mitraService: MitraService) {}

  // ─── Mitra Self ──────────────────────────────────────────────────────────

  @Roles(UserRole.MITRA)
  @Get('profile')
  getProfile(@Request() req) {
    return this.mitraService.getProfile(req.user.userId);
  }

  @Roles(UserRole.MITRA)
  @Patch('profile')
  updateProfile(@Request() req, @Body() dto: UpdateMitraProfileDto) {
    return this.mitraService.updateProfile(req.user.userId, dto);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  @Roles(UserRole.ADMIN)
  @Get('admin/list')
  listAll(@Query('status') status?: VerificationStatus) {
    return this.mitraService.listAll(status);
  }

  @Roles(UserRole.ADMIN)
  @Patch('admin/:id/verify')
  verify(@Param('id') id: string, @Body('action') action: 'approve' | 'reject') {
    return this.mitraService.verify(id, action);
  }
}
