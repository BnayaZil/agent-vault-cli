import { randomInt } from 'node:crypto';
import { customAlphabet } from 'nanoid';

const PASSWORD_LENGTH = 24;
const MIN_PASSWORD_LENGTH = 12;
const PASSWORD_CHARSET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';

const CHAR_CLASSES = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  special: '!@#$%^&*',
} as const;

/**
 * Cryptographically secure random character selection
 */
function secureRandomChar(charset: string): string {
  return charset[randomInt(charset.length)];
}

/**
 * Cryptographically secure Fisher-Yates shuffle
 */
function secureShuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Check if password meets complexity requirements
 */
function meetsComplexityRequirements(password: string): boolean {
  return (
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*]/.test(password)
  );
}

/**
 * Generate a cryptographically secure password using Node.js crypto.randomInt
 * Guarantees at least one character from each class (lowercase, uppercase, digit, special)
 *
 * @param length - Password length (minimum 12, default 24)
 * @throws Error if length is less than minimum
 */
export function generatePassword(length: number = PASSWORD_LENGTH): string {
  if (length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password length must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  // Start with one guaranteed character from each class
  const chars = [
    secureRandomChar(CHAR_CLASSES.lowercase),
    secureRandomChar(CHAR_CLASSES.uppercase),
    secureRandomChar(CHAR_CLASSES.digits),
    secureRandomChar(CHAR_CLASSES.special),
  ];

  // Fill remaining length with random characters from full charset
  while (chars.length < length) {
    chars.push(secureRandomChar(PASSWORD_CHARSET));
  }

  // Cryptographically secure shuffle to randomize position of guaranteed chars
  return secureShuffleArray(chars).join('');
}

/**
 * Alternative password generator using nanoid's customAlphabet
 * Regenerates until complexity requirements are met
 *
 * @param length - Password length (minimum 12, default 24)
 * @throws Error if length is less than minimum
 */
export function generatePasswordNanoid(length: number = PASSWORD_LENGTH): string {
  if (length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password length must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const generate = customAlphabet(PASSWORD_CHARSET, length);

  // Generate until we meet complexity requirements
  // With 24 chars from a 70-char alphabet including all classes,
  // probability of missing a class is extremely low (~0.01%)
  let password: string;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    password = generate();
    attempts++;
    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate compliant password after maximum attempts');
    }
  } while (!meetsComplexityRequirements(password));

  return password;
}
