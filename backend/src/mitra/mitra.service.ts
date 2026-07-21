import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MitraProfile, VerificationStatus } from '../database/entities/mitra-profile.entity';
import { UpdateMitraProfileDto } from './dto/update-mitra-profile.dto';

@Injectable()
export class MitraService {
  constructor(
    @InjectRepository(MitraProfile)
    private mitraProfileRepository: Repository<MitraProfile>,
  ) {}

  async getProfile(userId: string): Promise<MitraProfile> {
    const profile = await this.mitraProfileRepository.findOne({
      where: { userId },
      relations: { user: true },
    });
    if (!profile) {
      throw new NotFoundException('Profil mitra tidak ditemukan');
    }
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateMitraProfileDto): Promise<MitraProfile> {
    const profile = await this.getProfile(userId);
    Object.assign(profile, dto);
    return this.mitraProfileRepository.save(profile);
  }

  // ─── Admin Only ───────────────────────────────────────────────────────────

  async listAll(status?: VerificationStatus): Promise<MitraProfile[]> {
    const where = status ? { verificationStatus: status } : {};
    return this.mitraProfileRepository.find({
      where,
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  }

  async verify(mitraId: string, action: 'approve' | 'reject'): Promise<MitraProfile> {
    const profile = await this.mitraProfileRepository.findOne({ where: { id: mitraId } });
    if (!profile) {
      throw new NotFoundException('Mitra tidak ditemukan');
    }
    if (profile.verificationStatus !== VerificationStatus.PENDING) {
      throw new ForbiddenException('Mitra sudah diverifikasi sebelumnya');
    }

    profile.verificationStatus =
      action === 'approve' ? VerificationStatus.APPROVED : VerificationStatus.REJECTED;

    return this.mitraProfileRepository.save(profile);
  }
}
