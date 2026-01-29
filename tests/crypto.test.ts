import { describe, it, expect } from 'vitest';
import { generatePassword, generatePasswordNanoid } from '../src/core/crypto.js';

describe('generatePassword', () => {
  it('generates password of default length (24)', () => {
    const password = generatePassword();
    expect(password).toHaveLength(24);
  });

  it('generates password of specified length', () => {
    const password = generatePassword(32);
    expect(password).toHaveLength(32);
  });

  it('throws error for length below minimum (12)', () => {
    expect(() => generatePassword(8)).toThrow('Password length must be at least 12 characters');
    expect(() => generatePassword(11)).toThrow('Password length must be at least 12 characters');
  });

  it('accepts minimum length of 12', () => {
    const password = generatePassword(12);
    expect(password).toHaveLength(12);
  });

  it('contains at least one lowercase letter', () => {
    for (let i = 0; i < 10; i++) {
      const password = generatePassword();
      expect(password).toMatch(/[a-z]/);
    }
  });

  it('contains at least one uppercase letter', () => {
    for (let i = 0; i < 10; i++) {
      const password = generatePassword();
      expect(password).toMatch(/[A-Z]/);
    }
  });

  it('contains at least one digit', () => {
    for (let i = 0; i < 10; i++) {
      const password = generatePassword();
      expect(password).toMatch(/[0-9]/);
    }
  });

  it('contains at least one special character', () => {
    for (let i = 0; i < 10; i++) {
      const password = generatePassword();
      expect(password).toMatch(/[!@#$%^&*]/);
    }
  });

  it('only contains allowed characters', () => {
    const allowedChars = /^[a-zA-Z0-9!@#$%^&*]+$/;
    for (let i = 0; i < 10; i++) {
      const password = generatePassword();
      expect(password).toMatch(allowedChars);
    }
  });

  it('generates unique passwords', () => {
    const passwords = new Set<string>();
    for (let i = 0; i < 100; i++) {
      passwords.add(generatePassword());
    }
    // All 100 passwords should be unique
    expect(passwords.size).toBe(100);
  });
});

describe('generatePasswordNanoid', () => {
  it('generates password of default length (24)', () => {
    const password = generatePasswordNanoid();
    expect(password).toHaveLength(24);
  });

  it('generates password of specified length', () => {
    const password = generatePasswordNanoid(32);
    expect(password).toHaveLength(32);
  });

  it('throws error for length below minimum (12)', () => {
    expect(() => generatePasswordNanoid(8)).toThrow(
      'Password length must be at least 12 characters'
    );
    expect(() => generatePasswordNanoid(11)).toThrow(
      'Password length must be at least 12 characters'
    );
  });

  it('accepts minimum length of 12', () => {
    const password = generatePasswordNanoid(12);
    expect(password).toHaveLength(12);
  });

  it('contains at least one lowercase letter', () => {
    for (let i = 0; i < 10; i++) {
      const password = generatePasswordNanoid();
      expect(password).toMatch(/[a-z]/);
    }
  });

  it('contains at least one uppercase letter', () => {
    for (let i = 0; i < 10; i++) {
      const password = generatePasswordNanoid();
      expect(password).toMatch(/[A-Z]/);
    }
  });

  it('contains at least one digit', () => {
    for (let i = 0; i < 10; i++) {
      const password = generatePasswordNanoid();
      expect(password).toMatch(/[0-9]/);
    }
  });

  it('contains at least one special character', () => {
    for (let i = 0; i < 10; i++) {
      const password = generatePasswordNanoid();
      expect(password).toMatch(/[!@#$%^&*]/);
    }
  });

  it('only contains allowed characters', () => {
    const allowedChars = /^[a-zA-Z0-9!@#$%^&*]+$/;
    for (let i = 0; i < 10; i++) {
      const password = generatePasswordNanoid();
      expect(password).toMatch(allowedChars);
    }
  });

  it('generates unique passwords', () => {
    const passwords = new Set<string>();
    for (let i = 0; i < 100; i++) {
      passwords.add(generatePasswordNanoid());
    }
    // All 100 passwords should be unique
    expect(passwords.size).toBe(100);
  });
});
