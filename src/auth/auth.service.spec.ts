import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

// Mock UsersService — we don't want real DB calls in auth tests
const mockUsersService = {
  create: jest.fn(),
  findByEmail: jest.fn(),
  findOne: jest.fn(),
  updateRefreshToken: jest.fn(),
};

// Mock JwtService — we don't want real token generation (makes tests deterministic)
const mockJwtService = {
  sign: jest.fn().mockReturnValue('fake-token-123'),
  verify: jest.fn(),
};

// Mock Express Response object (we only need the cookie method)
const mockResponse = {
  cookie: jest.fn(),
  clearCookie: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── TEST: signup ──────────────────────────────────────────────────────────
  describe('signup', () => {
    it('should create a user, set a cookie, and return an access token', async () => {
      const dto = {
        name: 'Alice',
        email: 'alice@test.com',
        password: 'password123',
      };
      const createdUser = {
        id: 1,
        name: 'Alice',
        email: 'alice@test.com',
        role: 'user',
      };

      mockUsersService.create.mockResolvedValue(createdUser);
      mockUsersService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.signup(dto, mockResponse as any);

      // Access token should be returned
      expect(result.accessToken).toBeDefined();
      // User info should be returned (no password)
      expect(result.user.email).toBe('alice@test.com');
      expect(result.user).not.toHaveProperty('password');
      // Refresh token cookie should be set
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.any(String),
        expect.objectContaining({ httpOnly: true }),
      );
    });
  });

  // ── TEST: login ───────────────────────────────────────────────────────────
  describe('login', () => {
    it('should throw UnauthorizedException if user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null); // no user with this email

      await expect(
        service.login(
          { email: 'nobody@test.com', password: 'pass' },
          mockResponse as any,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      // User exists but with a different (hashed) password
      mockUsersService.findByEmail.mockResolvedValue({
        id: 1,
        email: 'alice@test.com',
        password:
          '$2b$10$wronghashXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      });

      await expect(
        service.login(
          { email: 'alice@test.com', password: 'wrongpassword' },
          mockResponse as any,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── TEST: refresh ─────────────────────────────────────────────────────────
  describe('refresh', () => {
    it('should throw UnauthorizedException if no cookie is present', async () => {
      const reqWithoutCookie = { cookies: {} }; // empty cookies

      await expect(
        service.refresh(reqWithoutCookie as any, mockResponse as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if token does not match DB', async () => {
      const reqWithCookie = { cookies: { refresh_token: 'some-token' } };

      // Token verifies OK
      mockJwtService.verify.mockReturnValue({ id: 1 });

      // But DB has a DIFFERENT token stored
      mockUsersService.findOne.mockResolvedValue({
        id: 1,
        refresh_token: 'different-token-in-db',
      });

      await expect(
        service.refresh(reqWithCookie as any, mockResponse as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── TEST: logout ──────────────────────────────────────────────────────────
  describe('logout', () => {
    it('should clear the refresh token and cookie', async () => {
      mockUsersService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.logout(1, mockResponse as any);

      // Token should be removed from DB
      expect(mockUsersService.updateRefreshToken).toHaveBeenCalledWith(1, null);
      // Cookie should be cleared from browser
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token');
      expect(result.message).toContain('Logged out');
    });
  });
});
