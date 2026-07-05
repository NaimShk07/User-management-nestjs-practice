import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { comparePassword, hashPassword } from '../common/utils/hash.helper';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  // Inject both UsersService (for DB access) and JwtService (for token creation/verification)
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ── Helper: Create a short-lived access token (15 minutes) ──────────────────
  // The access token is sent in every protected API request (Authorization header).
  // It contains the user's id, email, and role so we don't need to hit the DB every time.
  private createAccessToken(user: any): string {
    return this.jwtService.sign(
      { id: user.id, email: user.email, role: user.role },
      { expiresIn: 900 }, // 900 seconds = 15 minutes
    );
  }

  // ── Helper: Create a long-lived refresh token (7 days) ──────────────────────
  // The refresh token is stored in an HTTP-only cookie (the browser sends it automatically).
  // It only contains the user's id — we use it to issue a new access token when it expires.
  private createRefreshToken(userId: number): string {
    return this.jwtService.sign(
      { id: userId },
      { expiresIn: 604800 }, // 604800 seconds = 7 days
    );
  }

  // ── Helper: Set the refresh token in a secure HTTP-only cookie ───────────────
  // httpOnly: true  → JavaScript CANNOT read this cookie (protects against XSS attacks)
  // secure: false   → Change to true in production (only sends over HTTPS)
  // sameSite: strict → Cookie is only sent to requests from our own site
  // maxAge: 7 days  → Cookie automatically expires after 7 days
  private setRefreshTokenCookie(res: Response, token: string): void {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: false, // ⚠️ set to true in production
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });
  }

  // ── SIGNUP ───────────────────────────────────────────────────────────────────
  async signup(dto: SignupDto, res: Response) {
    // Hash the password — NEVER store plain text passwords in the database
    const hashedPassword = await hashPassword(dto.password);

    // Create the user in the database
    // UsersService.create already throws ConflictException if email is taken
    const newUser = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
    });

    // Generate both tokens
    const accessToken = this.createAccessToken(newUser);
    const refreshToken = this.createRefreshToken(newUser.id);

    // Save the refresh token in the database so we can verify it later
    await this.usersService.updateRefreshToken(newUser.id, refreshToken);

    // Put the refresh token in a cookie (user never sees this directly)
    this.setRefreshTokenCookie(res, refreshToken);

    // Return access token and safe user info (no password!)
    return {
      accessToken,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    };
  }

  // ── LOGIN ────────────────────────────────────────────────────────────────────
  async login(dto: LoginDto, res: Response) {
    // Step 1: Find user by email
    const user = await this.usersService.findByEmail(dto.email);

    // Step 2: If user not found, throw a vague error (don't reveal whether the email exists)
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Step 3: Compare the entered password with the hashed one in the DB
    const isPasswordValid = await comparePassword(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Step 4: Generate tokens
    const accessToken = this.createAccessToken(user);
    const refreshToken = this.createRefreshToken(user.id);

    // Step 5: Save the new refresh token to DB and put it in cookie
    await this.usersService.updateRefreshToken(user.id, refreshToken);
    this.setRefreshTokenCookie(res, refreshToken);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  // ── REFRESH TOKEN ────────────────────────────────────────────────────────────
  // This endpoint lets the user get a NEW access token using their refresh token.
  // The browser sends the refresh token automatically via cookie.
  async refresh(req: Request, res: Response) {
    // Step 1: Read the refresh token from the cookie
    const tokenFromCookie = req.cookies?.refresh_token;
    if (!tokenFromCookie) {
      throw new UnauthorizedException(
        'No refresh token found. Please login again.',
      );
    }

    // Step 2: Verify the token is valid (not tampered with or expired)
    let payload: any;
    try {
      payload = this.jwtService.verify(tokenFromCookie);
    } catch {
      throw new UnauthorizedException(
        'Refresh token is invalid or has expired. Please login again.',
      );
    }

    // Step 3: Find the user in the database
    const user = await this.usersService.findOne(payload.id);

    // Step 4: Check that the token in the cookie matches what we stored in the DB.
    // This is important — if the user logged out, we cleared the DB token,
    // so an old cookie won't work anymore.
    if (!user || user.refresh_token !== tokenFromCookie) {
      throw new UnauthorizedException(
        'Refresh token has been revoked. Please login again.',
      );
    }

    // Step 5: Issue a brand new access token AND refresh token (called "token rotation").
    // Token rotation means the old refresh token is replaced with a new one every time.
    // This limits the damage if an attacker steals a refresh token.
    const newAccessToken = this.createAccessToken(user);
    const newRefreshToken = this.createRefreshToken(user.id);

    await this.usersService.updateRefreshToken(user.id, newRefreshToken);
    this.setRefreshTokenCookie(res, newRefreshToken);

    return { accessToken: newAccessToken };
  }

  // ── LOGOUT ───────────────────────────────────────────────────────────────────
  async logout(userId: number, res: Response) {
    // Remove the refresh token from the database — it's no longer valid
    await this.usersService.updateRefreshToken(userId, null);

    // Clear the cookie from the browser
    res.clearCookie('refresh_token');

    return { message: 'Logged out successfully' };
  }

  // ── GOOGLE OAUTH ──────────────────────────────────────────────────────────────

  // Called by GoogleStrategy.validate() after Google verifies the user.
  // Finds the user in our DB, or creates them if it's their first time.
  async findOrCreateGoogleUser(googleUser: {
    googleId: string;
    email: string;
    name: string;
  }) {
    // Step 1: Have they logged in with Google before?
    let user = await this.usersService.findByGoogleId(googleUser.googleId);

    if (!user) {
      // Step 2: Do they have a regular account with the same email?
      user = await this.usersService.findByEmail(googleUser.email);

      if (user) {
        // They have an existing account — just link their Google ID to it
        await this.usersService.linkGoogleId(user.id, googleUser.googleId);
      } else {
        // Brand new user — create their account (no password needed)
        user = await this.usersService.createGoogleUser(googleUser);
      }
    }

    return user; // this gets attached to req.user by Passport
  }

  // Called from the Google callback controller route.
  // Generates tokens for the user and redirects them to the frontend.
  async googleLogin(user: any, res: Response) {
    const accessToken = this.createAccessToken(user);
    const refreshToken = this.createRefreshToken(user.id);

    await this.usersService.updateRefreshToken(user.id, refreshToken);
    this.setRefreshTokenCookie(res, refreshToken);

    // Redirect the browser to the frontend.
    // The frontend reads the token from the URL and stores it (e.g. in localStorage).
    // e.g. http://localhost:5173/auth/callback?token=eyJhbGc...
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}`);
  }
}
