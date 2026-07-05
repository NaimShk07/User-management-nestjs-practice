import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

// Mock UsersService — we don't want real DB calls in auth tests
const mockUsersService = {
  create: jest.fn(),
  findByEmail: jest.fn(),
  findOne: jest.fn(),
  updateRefreshToken: jest.fn(),
  findByGoogleId: jest.fn(),
  createGoogleUser: jest.fn(),
  linkGoogleId: jest.fn(),
};

// Mock JwtService — we don't want real token generation (makes tests deterministic)
const mockJwtService = {
  sign: jest.fn().mockReturnValue('fake-token-123'),
  verify: jest.fn(),
};

// Mock ConfigService
const mockConfigService = {
  get: jest.fn().mockReturnValue('http://localhost:5173'),
};

// Mock Express Response object (we only need the cookie method)
const mockResponse = {
  cookie: jest.fn(),
  clearCookie: jest.fn(),
  redirect: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
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

  // ── TEST: Google OAuth ────────────────────────────────────────────────────
  describe('Google OAuth', () => {
    const googleUserPayload = {
      googleId: 'google-12345',
      email: 'google@test.com',
      name: 'Google User',
    };

    it('should return user if google_id is already in DB', async () => {
      const existingUser = {
        id: 10,
        email: 'google@test.com',
        google_id: 'google-12345',
      };
      mockUsersService.findByGoogleId.mockResolvedValue(existingUser);

      const result = await service.findOrCreateGoogleUser(googleUserPayload);

      expect(result).toEqual(existingUser);
      expect(mockUsersService.findByGoogleId).toHaveBeenCalledWith(
        'google-12345',
      );
    });

    it('should link google_id to existing user email if already in DB', async () => {
      const regularUser = { id: 10, email: 'google@test.com', google_id: null };
      mockUsersService.findByGoogleId.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue(regularUser);
      mockUsersService.linkGoogleId.mockResolvedValue(undefined);

      const result = await service.findOrCreateGoogleUser(googleUserPayload);

      expect(result).toEqual(regularUser);
      expect(mockUsersService.linkGoogleId).toHaveBeenCalledWith(
        10,
        'google-12345',
      );
    });

    it('should create new google user if google_id and email are not in DB', async () => {
      const newUser = {
        id: 11,
        email: 'google@test.com',
        google_id: 'google-12345',
      };
      mockUsersService.findByGoogleId.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.createGoogleUser.mockResolvedValue(newUser);

      const result = await service.findOrCreateGoogleUser(googleUserPayload);

      expect(result).toEqual(newUser);
      expect(mockUsersService.createGoogleUser).toHaveBeenCalledWith(
        googleUserPayload,
      );
    });

    it('should redirect to frontend URL with access token on googleLogin', async () => {
      const user = { id: 10, email: 'google@test.com', role: 'user' };
      mockUsersService.updateRefreshToken.mockResolvedValue(undefined);

      await service.googleLogin(user, mockResponse as any);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.any(String),
        expect.any(Object),
      );
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:5173/auth/callback?token='),
      );
    });
  });
});
