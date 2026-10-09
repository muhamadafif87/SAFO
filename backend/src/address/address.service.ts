import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedAddress } from '../database/entities/saved-address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

// ─── Distance helper (Haversine formula) ─────────────────────────────────────
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(SavedAddress)
    private readonly repo: Repository<SavedAddress>,
  ) {}

  // ─── List ───────────────────────────────────────────────────────────────────

  async findAll(
    userId: string,
    userLat?: number,
    userLng?: number,
  ): Promise<(SavedAddress & { distanceKm?: number })[]> {
    const addresses = await this.repo.find({
      where: { userId },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });

    if (userLat !== undefined && userLng !== undefined) {
      return addresses.map((a) => ({
        ...a,
        latitude: Number(a.latitude),
        longitude: Number(a.longitude),
        distanceKm: parseFloat(
          haversineKm(
            userLat,
            userLng,
            Number(a.latitude),
            Number(a.longitude),
          ).toFixed(1),
        ),
      }));
    }

    return addresses.map((a) => ({
      ...a,
      latitude: Number(a.latitude),
      longitude: Number(a.longitude),
    }));
  }

  // ─── Create ─────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateAddressDto): Promise<SavedAddress> {
    // Jika isPrimary = true, reset semua yang lain terlebih dahulu
    if (dto.isPrimary) {
      await this.repo.update({ userId }, { isPrimary: false });
    }

    const address = this.repo.create({ ...dto, userId });
    return this.repo.save(address);
  }

  // ─── Update ─────────────────────────────────────────────────────────────────

  async update(
    id: string,
    userId: string,
    dto: UpdateAddressDto,
  ): Promise<SavedAddress> {
    const address = await this.findOneOwned(id, userId);

    if (dto.isPrimary) {
      await this.repo.update({ userId }, { isPrimary: false });
    }

    Object.assign(address, dto);
    return this.repo.save(address);
  }

  // ─── Set Primary ────────────────────────────────────────────────────────────

  async setPrimary(id: string, userId: string): Promise<SavedAddress> {
    const address = await this.findOneOwned(id, userId);
    await this.repo.update({ userId }, { isPrimary: false });
    address.isPrimary = true;
    return this.repo.save(address);
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const address = await this.findOneOwned(id, userId);
    await this.repo.remove(address);
    return { message: 'Alamat berhasil dihapus' };
  }

  // ─── Internal helper ────────────────────────────────────────────────────────

  private async findOneOwned(id: string, userId: string): Promise<SavedAddress> {
    const address = await this.repo.findOne({ where: { id } });
    if (!address) throw new NotFoundException('Alamat tidak ditemukan');
    if (address.userId !== userId)
      throw new ForbiddenException('Anda tidak berhak mengakses alamat ini');
    return address;
  }
}
