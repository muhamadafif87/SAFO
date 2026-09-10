import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MitraProfile } from '../database/entities/mitra-profile.entity';
import { User } from '../database/entities/user.entity';
import { AuthService } from './auth.service';
import {
    createRepositoryMock,
    createSeedUser,
    RepositoryMock,
    TEST_PASSWORD,
} from './test-fixtures';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: RepositoryMock<User>;
  let mitraProfileRepository: RepositoryMock<MitraProfile>;
  let jwtService: { sign: jest.Mock; verify: jest.Mock };

  beforeEach(async () => {
    userRepository = createRepositoryMock<User>();
    mitraProfileRepository = createRepositoryMock<MitraProfile>();
    jwtService = { sign: jest.fn(), verify: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        {
          provide: getRepositoryToken(MitraProfile),
          useValue: mitraProfileRepository,
        },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('logs in a seeded user and never returns passwordHash', async () => {
    const user = await createSeedUser();
    userRepository.findOne.mockResolvedValue(user);
    jwtService.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');

    const result = await service.login({
      email: user.email,
      password: TEST_PASSWORD,
    });

    expect(result.tokens).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user.email).toBe(user.email);
  });

  it('rejects an invalid password', async () => {
    const user = await createSeedUser();
    userRepository.findOne.mockResolvedValue(user);

    await expect(
      service.login({ email: user.email, password: 'wrong-password' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('registers a new customer with a hashed password', async () => {
    userRepository.findOne.mockResolvedValue(null);
    userRepository.create.mockImplementation((value) => ({
      id: 'new-user-1',
      ...value,
    }));
    userRepository.save.mockResolvedValue(undefined);

    const result = await service.registerCustomer({
      email: 'new.customer@test.safo.local',
      password: TEST_PASSWORD,
      phone: '081111111111',
    });

    expect(result).toEqual({ message: 'Registrasi berhasil' });
    const createdUser = userRepository.create.mock.calls[0][0];
    expect(createdUser.passwordHash).not.toBe(TEST_PASSWORD);
    expect(createdUser.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(userRepository.save).toHaveBeenCalled();
  });

  it('rejects registration when the email already exists', async () => {
    userRepository.findOne.mockResolvedValue(await createSeedUser());

    await expect(
      service.registerCustomer({
        email: 'customer@test.safo.local',
        password: TEST_PASSWORD,
      }),
    ).rejects.toThrow(ConflictException);
  });
});
