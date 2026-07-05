import * as bcrypt from 'bcrypt';

// bcrypt is a password hashing algorithm designed to be slow on purpose.
// That slowness makes it very hard for attackers to crack hashed passwords.

// How many times the hashing algorithm runs internally.
// 10 is the recommended default — higher = slower but more secure.
const SALT_ROUNDS = 10;

/**
 * Hashes a plain text password.
 * Always store the HASH in the database, never the plain password.
 *
 * Example:
 *   const hashed = await hashPassword('myPassword123');
 *   // hashed looks like: "$2b$10$abc...xyz"
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compares a plain text password with a hashed one from the database.
 * Returns true if they match, false if they don't.
 *
 * Example:
 *   const match = await comparePassword('myPassword123', hashedFromDB);
 *   if (match) { // login success }
 */
export async function comparePassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}
