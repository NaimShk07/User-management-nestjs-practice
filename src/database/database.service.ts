import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Pool,
  ResultSetHeader,
  RowDataPacket,
  createPool,
} from 'mysql2/promise';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;

  constructor(private readonly configService: ConfigService) {
    this.pool = createPool({
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 3306),
      user: this.configService.get<string>('DB_USERNAME', 'root'),
      password: this.configService.get<string>('DB_PASSWORD', ''),
      database: this.configService.get<string>('DB_NAME', 'user_management'),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  async onModuleInit() {
    // Verify DB connectivity on startup
    const conn = await this.pool.getConnection();
    this.logger.log('✅ MySQL connection pool established');
    conn.release();
  }

  /**
   * Run a SELECT query and return typed rows.
   */
  async query<T extends RowDataPacket>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [rows] = await this.pool.execute<T[]>(sql, params as any[]);
    return rows;
  }

  /**
   * Run an INSERT / UPDATE / DELETE and return the result header
   * (insertId, affectedRows, etc.).
   */
  async execute(
    sql: string,
    params: unknown[] = [],
  ): Promise<ResultSetHeader> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [result] = await this.pool.execute<ResultSetHeader>(sql, params as any[]);
    return result;
  }
}
