import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPool, Pool } from 'mysql2/promise';

// This service creates a MySQL connection pool and lets you run raw SQL queries.
// A "pool" means multiple connections are created and reused — much better than
// opening a new connection on every request.
@Injectable()
export class DatabaseService implements OnModuleInit {
  private pool: Pool;

  constructor(private configService: ConfigService) {
    // Create the pool when the service is first created
    this.pool = createPool({
      host:     this.configService.get('DB_HOST', 'localhost'),
      port:     this.configService.get<number>('DB_PORT', 3306),
      user:     this.configService.get('DB_USERNAME', 'root'),
      password: this.configService.get('DB_PASSWORD', ''),
      database: this.configService.get('DB_NAME', 'user_management'),
      connectionLimit: 10, // max 10 parallel connections
    });
  }

  // OnModuleInit runs automatically when NestJS starts
  // We use it to check the DB connection is working
  async onModuleInit() {
    const connection = await this.pool.getConnection();
    console.log('✅ MySQL connected successfully');
    connection.release(); // always release the connection back to the pool
  }

  // Run a SELECT query and get back an array of rows
  // The "?" in SQL is a placeholder — mysql2 replaces it with the values safely
  async query(sql: string, values: any[] = []): Promise<any[]> {
    const [rows] = await this.pool.execute(sql, values);
    return rows as any[];
  }

  // Run an INSERT, UPDATE, or DELETE query
  // Returns info like insertId (the new row's id) and affectedRows
  async execute(sql: string, values: any[] = []): Promise<any> {
    const [result] = await this.pool.execute(sql, values);
    return result;
  }
}
