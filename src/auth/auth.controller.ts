import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
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
    // req['user'] was set by JwtAuthGuard — it contains { id, email, role }
    const userId = req['user'].id;
    return this.authService.logout(userId, res);
  }
}
