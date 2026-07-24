import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { AdminService } from './admin.service';
import { MitraService } from '../mitra/mitra.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities/user.entity';
import { VerificationStatus } from '../database/entities/mitra-profile.entity';

// MitraService is not in this module's providers; we use it via MitraModule export.
// Since MitraModule exports MitraService, we must import MitraModule here.
// For simplicity during dev, we'll duplicate the mitra-verification logic here.
// Alternatively, import MitraModule into AdminModule (cleaner approach).

@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly mitraService: MitraService,
  ) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('transactions')
  getTransactions() {
    return this.adminService.getAllTransactions();
  }

  @Get('settings/platform-fee')
  getPlatformFee() {
    return this.adminService.getPlatformFee();
  }

  // --- Mitra Management ---

  @Get('mitra/pending')
  getPendingMitra() {
    return this.mitraService.listAll(VerificationStatus.PENDING);
  }

  @Patch('mitra/:id/verify')
  verifyMitra(@Param('id') id: string, @Body('action') action: 'approve' | 'reject') {
    return this.mitraService.verify(id, action);
  }

  // --- User Management ---

  @Patch('users/:id/suspend')
  suspendUser(@Param('id') id: string) {
    return this.adminService.suspendUser(id);
  }
}
