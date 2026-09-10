import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { MitraProfile } from '../database/entities/mitra-profile.entity';
import { User, UserRole, UserStatus } from '../database/entities/user.entity';

export const TEST_PASSWORD = 'password123';

export type RepositoryMock<T> = Pick<
  Repository<T>,
  'findOne' | 'create' | 'save'
> & {
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

export function createRepositoryMock<T>(): RepositoryMock<T> {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
}

export async function createSeedUser(
  overrides: Partial<User> = {},
): Promise<User> {
  return {
    id: 'user-customer-1',
    email: 'customer@test.safo.local',
    passwordHash: await bcrypt.hash(TEST_PASSWORD, 10),
    phone: '081234567890',
    role: UserRole.CUSTOMER,
    status: UserStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    mitraProfile: null,
    orders: [],
    statusLogs: [],
    reviews: [],
    ...overrides,
  } as User;
}

export function createSeedMitraProfile(userId: string): MitraProfile {
  return {
    id: 'mitra-profile-1',
    userId,
    businessName: 'Toko Test SAFO',
    category: 'Bakery',
    address: 'Jl. Testing No. 1',
    latitude: -6.2,
    longitude: 106.8,
    verificationStatus: 'approved' as MitraProfile['verificationStatus'],
  } as MitraProfile;
}
