import { describe, it, expect } from 'vitest';
import {
  MIN_PASSWORD_LENGTH,
  validatePassword,
  validateReportInput,
  validateLoginInput,
  validateRegisterInput,
  validateBuildingInput,
  validateCollegeInput,
  getCollegeRegistrationDomainError,
} from '../../src/lib/validators';

describe('Validators', () => {
  it('accepts a valid student registration with a college email and enforces minimum 8-char password', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(validatePassword('1234567')).toBe('Use a password with at least 8 characters.');
    expect(validatePassword('12345678')).toBeNull();

    const shortPass = validateRegisterInput({
      full_name: 'Shaharyar Khan',
      email: 'student@kcc.edu',
      password: '1234567',
      role: 'student',
      college_id: 'kcc-college-id',
    });
    expect(shortPass.isValid).toBe(false);
    expect(shortPass.errors.password).toBe('Use a password with at least 8 characters.');

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
        building_label: 'Academic Block',
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

    it('requires a building selection or a building name', () => {
      const result = validateReportInput({
        title: 'Broken tube light in Lab 201',
        description: 'The tube light is constantly flickering and humming loudly.',
        category: 'electrical',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.building_label).toBeDefined();
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
    it('validates email/username and requires non-empty password', () => {
      const valid = validateLoginInput({ email: 'user@campus.edu', password: 'password123' });
      expect(valid.isValid).toBe(true);

      const validShortLegacy = validateLoginInput({ email: 'user@campus.edu', password: '123' });
      expect(validShortLegacy.isValid).toBe(true);

      const invalidEmail = validateLoginInput({ email: 'bad-email', password: 'password123' });
      expect(invalidEmail.isValid).toBe(false);

      const emptyPass = validateLoginInput({ email: 'user@campus.edu', password: '' });
      expect(emptyPass.isValid).toBe(false);
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
      expect(
        validateCollegeInput({ name: 'NIT', slug: 'nit-delhi', email_domain: 'nit.ac.in' }).isValid
      ).toBe(true);
      expect(
        validateCollegeInput({
          name: 'NIT',
          slug: 'Invalid Slug!',
          email_domain: 'nit.ac.in',
        }).isValid
      ).toBe(false);
    });

    it('requires comma-separated email domains without spaces or @', () => {
      expect(
        validateCollegeInput({ name: 'NIT', slug: 'nit', email_domain: '' }).errors.email_domain
      ).toBe('At least one allowed email domain is required.');
      expect(
        validateCollegeInput({ name: 'NIT', slug: 'nit', email_domain: '@nit.ac.in' }).errors.email_domain
      ).toBe('Enter comma-separated domains without spaces or @.');
      expect(
        validateCollegeInput({ name: 'NIT', slug: 'nit', email_domain: 'nit.ac.in, example.edu' })
          .errors.email_domain
      ).toBe('Enter comma-separated domains without spaces or @.');
      expect(
        validateCollegeInput({ name: 'NIT', slug: 'nit', email_domain: 'nit.ac.in,example.edu' })
          .isValid
      ).toBe(true);
    });
  });

  describe('getCollegeRegistrationDomainError', () => {
    it('blocks student registration when the college has no configured domains', () => {
      expect(getCollegeRegistrationDomainError('student@example.edu', null, 'student')).toBe(
        'This college is not accepting registrations yet.'
      );
    });

    it('allows admins without configured domains but keeps configured domains enforced', () => {
      expect(getCollegeRegistrationDomainError('admin@example.com', '', 'admin')).toBeNull();
      expect(getCollegeRegistrationDomainError('admin@example.com', 'college.edu', 'admin')).toBe(
        'Use an email address from your selected college domain.'
      );
      expect(
        getCollegeRegistrationDomainError('admin@college.edu', 'college.edu', 'admin')
      ).toBeNull();
    });
  });
});
