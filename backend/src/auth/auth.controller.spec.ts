import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    registerCustomer: jest.fn(),
    registerMitra: jest.fn(),
    login: jest.fn(),
    getProfile: jest.fn(),
    refreshToken: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates login to AuthService', async () => {
    const dto = { email: 'customer@test.safo.local', password: 'password123' };
    authService.login.mockResolvedValue({ user: { email: dto.email } });

    await expect(controller.login(dto)).resolves.toEqual({
      user: { email: dto.email },
    });
    expect(authService.login).toHaveBeenCalledWith(dto);
  });
});
