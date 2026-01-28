import { nanoid } from 'nanoid';

const PASSWORD_LENGTH = 24;
const PASSWORD_CHARSET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';

export function generatePassword(length: number = PASSWORD_LENGTH): string {
  // Use nanoid for cryptographically secure random characters
  const randomPart = nanoid(length);
  
  // Ensure we have at least one of each required character type
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const special = '!@#$%^&*';
  
  const chars = [
    lowercase[Math.floor(Math.random() * lowercase.length)],
    uppercase[Math.floor(Math.random() * uppercase.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  
  // Fill the rest with random characters from the charset
  while (chars.length < length) {
    chars.push(PASSWORD_CHARSET[Math.floor(Math.random() * PASSWORD_CHARSET.length)]);
  }
  
  // Shuffle the array
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  
  return chars.join('');
}
