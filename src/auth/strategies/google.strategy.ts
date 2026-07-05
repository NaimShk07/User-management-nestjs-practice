import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

// A "Strategy" in Passport is the logic for one specific authentication method.
// This GoogleStrategy tells Passport HOW to authenticate using Google OAuth.
//
// The full flow:
//   1. User visits GET /auth/google
//   2. Passport redirects them to Google's login page (using clientID + clientSecret)
//   3. User logs in on Google and grants permission
//   4. Google redirects back to GOOGLE_CALLBACK_URL with an authorization code
//   5. Passport exchanges the code for user profile info
//   6. The validate() method below runs with that profile info
//   7. We find or create the user in our database
//   8. Passport attaches the user to req.user
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private authService: AuthService,
  ) {
    // super() configures the Google OAuth connection
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') as string,
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') as string,
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') as string,
      scope: ['email', 'profile'], // what info we want from Google
    });
  }

  // This method runs automatically after Google successfully verifies the user.
  // "profile" contains the user's Google account info.
  // Whatever we return here gets attached to req.user in the controller.
  async validate(
    _accessToken: string, // Google's access token (we don't need this — we use our own JWT)
    _refreshToken: string, // Google's refresh token (we don't need this either)
    profile: any, // the user's Google profile data
  ): Promise<any> {
    // Extract the info we need from the Google profile
    const googleUser = {
      googleId: profile.id, // unique Google user ID
      email: profile.emails[0].value, // user's email
      name: `${profile.name.givenName} ${profile.name.familyName}`, // full name
    };

    // Find the user in our DB (or create them if it's their first Google login)
    return this.authService.findOrCreateGoogleUser(googleUser);
  }
}
