import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler'; // lets us set a custom limit per route
import { AuthGuard } from '@nestjs/passport'; // used for Google OAuth guard
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

// All routes in this controller start with /auth
// e.g.  POST /auth/signup,  POST /auth/login,  etc.
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ── POST /auth/signup ───────────────────────────────────────────────────────
  // Public — anyone can call this
  // @Res({ passthrough: true }) gives us access to the response object
  // so we can set the cookie, while still letting the interceptor wrap the response.
  @Post('signup')
  signup(@Body() body: SignupDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.signup(body, res);
  }

  // ── POST /auth/login ────────────────────────────────────────────────────────
  // Public — anyone can call this
  // @Throttle overrides the global limit for this specific route:
  // max 5 login attempts per minute per IP — prevents brute force password guessing
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(body, res);
  }

  // ── POST /auth/refresh ──────────────────────────────────────────────────────
  // Public — the browser automatically sends the refresh_token cookie here.
  // No Bearer token needed — this is how you get a new access token when it expires.
  @Post('refresh')
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh(req, res);
  }

  // ── POST /auth/logout ───────────────────────────────────────────────────────
  // Protected — the user must be logged in (send a valid Bearer token) to logout.
  // @UseGuards(JwtAuthGuard) runs the guard before this method executes.
  // The guard puts the decoded user info into req['user'].
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Cast req to any to safely read req.user without TypeScript complaining
    const userId = (req as any).user.id;
    return this.authService.logout(userId, res);
  }

  // ── GET /auth/google ─────────────────────────────────────────────────────────
  // Public — visiting this URL in a browser starts the Google login flow.
  // Passport reads the GoogleStrategy config and redirects to Google's login page.
  // The user never sees code here — they are instantly redirected to Google.
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Passport handles the redirect — this method body never actually runs
  }

  // ── GET /auth/google/callback ─────────────────────────────────────────────────
  // Public — Google redirects the browser here after the user grants permission.
  // AuthGuard('google') runs GoogleStrategy.validate() which sets req.user.
  // We then generate JWT tokens and redirect the user to the frontend.
  // Note: We use @Res() without passthrough because we are doing res.redirect(),
  //       not returning data — so the ResponseInterceptor should NOT wrap this.
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request, @Res() res: Response) {
    return this.authService.googleLogin(req['user'], res);
  }
}
