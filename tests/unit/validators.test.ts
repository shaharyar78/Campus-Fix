import { describe, it, expect } from 'vitest';
import {
  validateReportInput,
  validateLoginInput,
  validateRegisterInput,
  validateBuildingInput,
  validateCollegeInput,
} from '../../src/lib/validators';

describe('Validators', () => {
  it('accepts a valid student registration with a college email', () => {
    const result = validateRegisterInput({
      full_name: 'Shaharyar Khan',
      email: 'student@kcc.edu',
      password: 'secure-pass-123',
      role: 'student',
      college_id: 'kcc-college-id',
    });
    expect(result.isValid).toBe(true);
  });

  describe('validateReportInput', () => {
    it('validates correct report data', () => {
      const result = validateReportInput({
        title: 'Broken tube light in Lab 201',
        description: 'The tube light is constantly flickering and humming loudly.',
        category: 'electrical',
      });
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });

    it('rejects short title or short description', () => {
      const result = validateReportInput({
        title: 'No',
        description: 'short',
        category: 'electrical',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.title).toBeDefined();
      expect(result.errors.description).toBeDefined();
    });

    it('rejects invalid category', () => {
      const result = validateReportInput({
        title: 'Valid title here',
        description: 'This is a sufficiently long description for validation.',
        category: 'alien-invasion',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.category).toBeDefined();
    });
  });

  describe('validateLoginInput', () => {
    it('validates email and password', () => {
      const valid = validateLoginInput({ email: 'user@campus.edu', password: 'password123' });
      expect(valid.isValid).toBe(true);

      const invalidEmail = validateLoginInput({ email: 'bad-email', password: 'password123' });
      expect(invalidEmail.isValid).toBe(false);

      const invalidPass = validateLoginInput({ email: 'user@campus.edu', password: '123' });
      expect(invalidPass.isValid).toBe(false);
    });
  });

  describe('validateBuildingInput', () => {
    it('requires building name with at least 2 characters', () => {
      expect(validateBuildingInput({ name: 'A' }).isValid).toBe(false);
      expect(validateBuildingInput({ name: 'Science Block' }).isValid).toBe(true);
    });
  });

  describe('validateCollegeInput', () => {
    it('validates college name and slug format', () => {
      expect(validateCollegeInput({ name: 'NIT', slug: 'nit-delhi' }).isValid).toBe(true);
      expect(validateCollegeInput({ name: 'NIT', slug: 'Invalid Slug!' }).isValid).toBe(false);
    });
  });
});
