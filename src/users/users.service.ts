import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { DatabaseService } from '../database/database.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './entities/user.entity';

interface UserRow extends User, RowDataPacket {}

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(private readonly db: DatabaseService) {}

  /** Auto-create the users table on startup if it doesn't exist */
  async onModuleInit() {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        name         VARCHAR(100)                        NOT NULL,
        email        VARCHAR(150)                        NOT NULL UNIQUE,
        password     VARCHAR(255)                        NOT NULL,
        role         ENUM('admin', 'user')               NOT NULL DEFAULT 'user',
        refresh_token TEXT                               NULL,
        created_at   TIMESTAMP                           NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at   TIMESTAMP                           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  // ─── CREATE ────────────────────────────────────────────────────────────────

  async create(dto: CreateUserDto): Promise<User> {
    // Duplicate email check
    const [existing] = await this.db.query<UserRow>(
      'SELECT id FROM users WHERE email = ?',
      [dto.email],
    );
    if (existing) {
      throw new ConflictException(
        `User with email "${dto.email}" already exists`,
      );
    }

    const role = dto.role ?? UserRole.USER;
    const result = await this.db.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [dto.name, dto.email, dto.password, role],
    );

    return this.findOne(result.insertId);
  }

  // ─── READ ALL ──────────────────────────────────────────────────────────────

  async findAll(): Promise<User[]> {
    return this.db.query<UserRow>('SELECT * FROM users ORDER BY id ASC');
  }

  // ─── READ ONE ──────────────────────────────────────────────────────────────

  async findOne(id: number): Promise<User> {
    const [user] = await this.db.query<UserRow>(
      'SELECT * FROM users WHERE id = ?',
      [id],
    );
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  // ─── FIND BY EMAIL ─────────────────────────────────────────────────────────

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.db.query<UserRow>(
      'SELECT * FROM users WHERE email = ?',
      [email],
    );
    return user ?? null;
  }

  // ─── UPDATE ────────────────────────────────────────────────────────────────

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    await this.findOne(id); // throws 404 if not found

    // Build SET clause dynamically from provided fields only
    const allowedFields: (keyof UpdateUserDto)[] = [
      'name',
      'email',
      'password',
      'role',
    ];
    const setClauses: string[] = [];
    const params: unknown[] = [];

    for (const field of allowedFields) {
      if (dto[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        params.push(dto[field]);
      }
    }

    if (setClauses.length === 0) {
      // Nothing to update — return existing record
      return this.findOne(id);
    }

    params.push(id);
    await this.db.execute(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
      params,
    );

    return this.findOne(id);
  }

  // ─── UPDATE REFRESH TOKEN ──────────────────────────────────────────────────

  async updateRefreshToken(
    id: number,
    refreshToken: string | null,
  ): Promise<void> {
    await this.findOne(id); // throws 404 if not found
    await this.db.execute(
      'UPDATE users SET refresh_token = ? WHERE id = ?',
      [refreshToken, id],
    );
  }

  // ─── DELETE ────────────────────────────────────────────────────────────────

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id); // throws 404 if not found
    await this.db.execute('DELETE FROM users WHERE id = ?', [id]);
    return { message: `User with id ${id} successfully deleted` };
  }
}
