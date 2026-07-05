import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { DatabaseService } from '../database/database.service';

// ── What is a Unit Test? ─────────────────────────────────────────────────────
// A unit test checks one small piece of code in isolation.
// We don't connect to a real database — instead we use a "mock" (fake) database
// that returns whatever we tell it to return.
// This makes tests fast and predictable.

// ── What is a Mock? ──────────────────────────────────────────────────────────
// A mock is a fake version of a dependency.
// We create a fake DatabaseService so our tests don't need a real MySQL connection.
const mockDatabaseService = {
  query: jest.fn(), // jest.fn() creates a fake function we can control
  execute: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  // beforeEach runs before every single test (every `it(...)` block)
  // It creates a fresh copy of the service with the mock database
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        // Instead of the real DatabaseService, inject our mock
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    // Reset mock call history before each test so tests don't affect each other
    jest.clearAllMocks();
  });

  // ── TEST: service is created correctly ────────────────────────────────────
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── TEST: findAll returns list of users ───────────────────────────────────
  describe('findAll', () => {
    it('should return an array of users', async () => {
      // "Arrange" — set up what the fake DB will return
      const fakeUsers = [
        { id: 1, name: 'Alice', email: 'alice@test.com', role: 'user' },
        { id: 2, name: 'Bob', email: 'bob@test.com', role: 'admin' },
      ];
      mockDatabaseService.query.mockResolvedValue(fakeUsers);

      // "Act" — call the method we're testing
      const result = await service.findAll();

      // "Assert" — check the result is what we expect
      expect(result).toEqual(fakeUsers);
      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        'SELECT * FROM users ORDER BY id ASC',
      );
    });
  });

  // ── TEST: findOne finds a user by id ──────────────────────────────────────
  describe('findOne', () => {
    it('should return a user when found', async () => {
      const fakeUser = { id: 1, name: 'Alice', email: 'alice@test.com' };
      // query returns an array — our service does `const [user] = await ...`
      mockDatabaseService.query.mockResolvedValue([fakeUser]);

      const result = await service.findOne(1);

      expect(result).toEqual(fakeUser);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Return an empty array = no user found
      mockDatabaseService.query.mockResolvedValue([]);

      // We expect this call to throw a NotFoundException
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── TEST: create rejects duplicate emails ────────────────────────────────
  describe('create', () => {
    it('should throw ConflictException if email already exists', async () => {
      // Simulate: email check finds an existing user
      const existingUser = { id: 1, email: 'existing@test.com' };
      mockDatabaseService.query.mockResolvedValue([existingUser]);

      await expect(
        service.create({
          name: 'Test',
          email: 'existing@test.com',
          password: 'pass123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create and return a new user when email is unique', async () => {
      const newUser = {
        id: 3,
        name: 'Charlie',
        email: 'charlie@test.com',
        role: 'user',
      };

      // First call: email check → no existing user
      // Second call: findOne after insert → returns the new user
      mockDatabaseService.query
        .mockResolvedValueOnce([]) // email check: not found
        .mockResolvedValueOnce([newUser]); // findOne after insert

      // execute = INSERT query, returns { insertId: 3 }
      mockDatabaseService.execute.mockResolvedValue({ insertId: 3 });

      const result = await service.create({
        name: 'Charlie',
        email: 'charlie@test.com',
        password: 'hashedpassword',
      });

      expect(result).toEqual(newUser);
    });
  });

  // ── TEST: remove deletes a user ───────────────────────────────────────────
  describe('remove', () => {
    it('should delete a user and return a success message', async () => {
      const fakeUser = { id: 1, name: 'Alice' };
      mockDatabaseService.query.mockResolvedValue([fakeUser]);
      mockDatabaseService.execute.mockResolvedValue({ affectedRows: 1 });

      const result = await service.remove(1);

      expect(result).toEqual({ message: 'User 1 deleted successfully' });
      expect(mockDatabaseService.execute).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = ?',
        [1],
      );
    });

    it('should throw NotFoundException when deleting a non-existent user', async () => {
      mockDatabaseService.query.mockResolvedValue([]); // no user found

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
