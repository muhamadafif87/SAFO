import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MitraProfile, VerificationStatus } from '../database/entities/mitra-profile.entity';
import { User } from '../database/entities/user.entity';
import { UpdateMitraProfileDto } from './dto/update-mitra-profile.dto';

@Injectable()
export class MitraService {
  constructor(
    @InjectRepository(MitraProfile)
    private mitraProfileRepository: Repository<MitraProfile>,
  ) {}

  /**
   * Buang password_hash dari relasi user sebelum response dikirim.
   * Tanpa ini, GET /mitra/profile dan /mitra/admin/list ikut membocorkan hash.
   */
  private sanitize(profile: MitraProfile): MitraProfile {
    if (!profile.user) return profile;
    const safeUser: Partial<User> = { ...profile.user };
    delete safeUser.passwordHash;
    return { ...profile, user: safeUser as User };
  }

  async getProfile(userId: string): Promise<MitraProfile> {
    const profile = await this.mitraProfileRepository.findOne({
      where: { userId },
      relations: { user: true },
    });
    if (!profile) {
      throw new NotFoundException('Profil mitra tidak ditemukan');
    }
    return this.sanitize(profile);
  }

  async updateProfile(userId: string, dto: UpdateMitraProfileDto): Promise<MitraProfile> {
    const profile = await this.getProfile(userId);
    if (dto.phone && profile.userId) {
      await this.mitraProfileRepository.manager.update(User, { id: profile.userId }, { phone: dto.phone });
    }
    Object.assign(profile, dto);
    return this.sanitize(await this.mitraProfileRepository.save(profile));
  }

  // ─── Admin Only ───────────────────────────────────────────────────────────

  async listAll(status?: VerificationStatus): Promise<MitraProfile[]> {
    const where = status ? { verificationStatus: status } : {};
    const profiles = await this.mitraProfileRepository.find({
      where,
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
    return profiles.map((profile) => this.sanitize(profile));
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

  // ─── Public ───────────────────────────────────────────────────────────────

  async getPublicProfile(id: string): Promise<Partial<MitraProfile>> {
    const profile = await this.mitraProfileRepository.findOne({
      where: { id },
      relations: { operationalHours: true },
    });
    if (!profile) {
      throw new NotFoundException('Mitra tidak ditemukan');
    }
    return {
      id: profile.id,
      businessName: profile.businessName,
      category: profile.category,
      address: profile.address,
      latitude: profile.latitude,
      longitude: profile.longitude,
      photoUrl: profile.photoUrl,
      operationalHours: profile.operationalHours,
    };
  }
}
