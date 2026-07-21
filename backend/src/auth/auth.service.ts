import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { User, UserRole } from '../database/entities/user.entity';
import { MitraProfile, VerificationStatus } from '../database/entities/mitra-profile.entity';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { RegisterMitraDto } from './dto/register-mitra.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(MitraProfile)
    private mitraProfileRepository: Repository<MitraProfile>,
    private jwtService: JwtService,
  ) {}

  async registerCustomer(dto: RegisterCustomerDto) {
    const existingUser = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepository.create({
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
}

