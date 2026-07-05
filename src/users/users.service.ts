import {
  Injectable,
  NotFoundException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// A Service holds your business logic (the real work).
// Controllers receive requests, Services do the actual work.
@Injectable()
export class UsersService implements OnModuleInit {
  // Inject DatabaseService so we can run SQL queries
  constructor(private db: DatabaseService) {}

  // This runs automatically when the app starts.
  // It creates the users table if it doesn't already exist,
  // then safely adds the google_id column for Google OAuth users.
  async onModuleInit() {
    // Create the table on first run.
    // password is NULL because Google users don't have a password.
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        name          VARCHAR(100)         NOT NULL,
        email         VARCHAR(150)         NOT NULL UNIQUE,
        password      VARCHAR(255)         NULL,        -- NULL for Google OAuth users
        google_id     VARCHAR(255)         NULL UNIQUE, -- Google's unique user ID
        role          ENUM('admin','user') NOT NULL DEFAULT 'user',
        refresh_token TEXT                 NULL,
        created_at    TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // If the table already existed (without google_id), add the column now.
    // We wrap in try/catch because MySQL throws an error if the column already exists.
    try {
      await this.db.execute(
        'ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL UNIQUE',
      );
    } catch {
      // Column already exists — that's fine, nothing to do
    }

    // Also make password nullable for existing tables (needed for Google users)
    try {
      await this.db.execute(
        'ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL',
      );
    } catch {
      // Already nullable — that's fine
    }
  }

  // ── CREATE a new user ─────────────────────────────────────────────────────

  async create(dto: CreateUserDto) {
    // First check: does a user with this email already exist?
    const existing = await this.db.query(
      'SELECT id FROM users WHERE email = ?',
      [dto.email],
    );

    if (existing.length > 0) {
      // 409 Conflict — email must be unique
      throw new ConflictException(`Email "${dto.email}" is already registered`);
    }

    // Set default role to 'user' if not provided
    const role = dto.role ?? 'user';

    // Insert the new user and get the auto-generated id back
    const result = await this.db.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [dto.name, dto.email, dto.password, role],
    );

    // Fetch and return the newly created user
    return this.findOne(result.insertId);
  }

  // ── GET all users ─────────────────────────────────────────────────────────

  async findAll() {
    return this.db.query('SELECT * FROM users ORDER BY id ASC');
  }

  // ── GET one user by id ────────────────────────────────────────────────────

  async findOne(id: number) {
    // query() returns an array — we take the first element
    const [user] = await this.db.query('SELECT * FROM users WHERE id = ?', [
      id,
    ]);

    if (!user) {
      // 404 Not Found
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  // ── GET one user by email (used during login) ─────────────────────────────

  async findByEmail(email: string) {
    const [user] = await this.db.query('SELECT * FROM users WHERE email = ?', [
      email,
    ]);
    return user ?? null; // return null if not found
  }

  // ── UPDATE a user ─────────────────────────────────────────────────────────

  async update(id: number, dto: UpdateUserDto) {
    // Make sure the user exists first (throws 404 if not)
    await this.findOne(id);

    // Build the SET part of the query dynamically.
    // We only update the fields that were actually sent in the request.
    const fields: string[] = []; // e.g. ['name = ?', 'email = ?']
    const values: any[] = []; // e.g. ['John', 'john@example.com']

    if (dto.name !== undefined) {
      fields.push('name = ?');
      values.push(dto.name);
    }
    if (dto.email !== undefined) {
      fields.push('email = ?');
      values.push(dto.email);
    }
    if (dto.password !== undefined) {
      fields.push('password = ?');
      values.push(dto.password);
    }
    if (dto.role !== undefined) {
      fields.push('role = ?');
      values.push(dto.role);
    }

    // If nothing was sent, just return the user as-is
    if (fields.length === 0) {
      return this.findOne(id);
    }

    values.push(id); // the WHERE id = ?
    await this.db.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );

    // Return the updated user
    return this.findOne(id);
  }

  // ── UPDATE refresh token (called after login/logout) ──────────────────────

  async updateRefreshToken(id: number, refreshToken: string | null) {
    await this.findOne(id); // throws 404 if user doesn't exist

    await this.db.execute('UPDATE users SET refresh_token = ? WHERE id = ?', [
      refreshToken,
      id,
    ]);
  }

  // ── DELETE a user ─────────────────────────────────────────────────────────

  async remove(id: number) {
    await this.findOne(id); // throws 404 if user doesn't exist

    await this.db.execute('DELETE FROM users WHERE id = ?', [id]);

    return { message: `User ${id} deleted successfully` };
  }

  // ── GOOGLE OAUTH HELPERS ───────────────────────────────────────────────────

  // Find a user by their Google ID (used on repeat Google logins)
  async findByGoogleId(googleId: string) {
    const [user] = await this.db.query(
      'SELECT * FROM users WHERE google_id = ?',
      [googleId],
    );
    return user ?? null;
  }

  // Create a brand new user who signed up via Google.
  // They don't have a password — their identity is verified by Google.
  async createGoogleUser(data: {
    googleId: string;
    email: string;
    name: string;
  }) {
    const result = await this.db.execute(
      'INSERT INTO users (name, email, google_id) VALUES (?, ?, ?)',
      [data.name, data.email, data.googleId],
    );
    return this.findOne(result.insertId);
  }

  // If a user already has a regular account (email/password) and then logs in
  // with Google, link their Google ID to their existing account.
  async linkGoogleId(userId: number, googleId: string) {
    await this.db.execute('UPDATE users SET google_id = ? WHERE id = ?', [
      googleId,
      userId,
    ]);
  }
}
