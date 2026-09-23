import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { User, UserRole } from '../database/entities/user.entity';
import { MitraProfile, VerificationStatus } from '../database/entities/mitra-profile.entity';
import { Order } from '../database/entities/order.entity';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { RegisterMitraDto } from './dto/register-mitra.dto';
import { LoginDto } from './dto/login.dto';

/** Number of completed orders required to be considered VIP */
const VIP_ORDER_THRESHOLD = 5;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(MitraProfile)
    private mitraProfileRepository: Repository<MitraProfile>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private jwtService: JwtService,
    private dataSource: DataSource,
  ) {}

  /** Returns true if the customer has >= VIP_ORDER_THRESHOLD completed orders */
  private async checkIsVip(userId: string): Promise<boolean> {
    try {
      const count = await this.orderRepository.count({
        where: { customerId: userId, status: 'completed' as any },
      });
      return count >= VIP_ORDER_THRESHOLD;
    } catch {
      return false;
    }
  }

  async registerCustomer(dto: RegisterCustomerDto) {
    const existingUser = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      phone: dto.phone,
      role: UserRole.CUSTOMER,
    });

    await this.userRepository.save(user);

    return { message: 'Registrasi berhasil' };
  }

  async registerMitra(dto: RegisterMitraDto) {
    const existingUser = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      role: UserRole.MITRA,
    });
    await this.userRepository.save(user);

    // locationPoint logic removed for now

    const profile = this.mitraProfileRepository.create({
      userId: user.id,
      businessName: dto.businessName,
      category: dto.category,
      address: dto.address,
      latitude: dto.latitude || 0,
      longitude: dto.longitude || 0,
      verificationStatus: VerificationStatus.PENDING,
    });

    await this.mitraProfileRepository.save(profile);

    return { message: 'Registrasi Mitra berhasil, menunggu verifikasi admin' };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      relations: { mitraProfile: true },
    });

    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    
    // Generate tokens (In real app, add refresh token logic)
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' }); // Simple refresh mock

    const { passwordHash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens: {
        accessToken,
        refreshToken,
      },
      mitra: user.mitraProfile || null,
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { mitraProfile: true },
    });

    if (!user) throw new UnauthorizedException();

    const isVip = user.role === UserRole.CUSTOMER ? await this.checkIsVip(userId) : false;

    const { passwordHash, ...userWithoutPassword } = user;
    return {
      user: { ...userWithoutPassword, isVip },
      mitra: user.mitraProfile || null,
    };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException();

      const newPayload = { sub: user.id, email: user.email, role: user.role };
      const accessToken = this.jwtService.sign(newPayload);
      const refreshToken = this.jwtService.sign(newPayload, { expiresIn: '7d' });

      return {
        tokens: {
          accessToken,
          refreshToken,
        },
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}

