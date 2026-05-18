import { Test, TestingModule } from '@nestjs/testing';
import { EmailProducer } from '@repo/shared';
import { AppService } from './app.service';

/**
 * Unit tests for AppService (Notifications)
 *
 * Tests cover:
 * - sendUserCreatedNotification() — delegates to EmailProducer.sendWelcomeEmail
 * - sendEmailVerificationNotification() — delegates to EmailProducer.sendEmailVerificationEmail
 * - sendPasswordResetNotification() — delegates to EmailProducer.sendPasswordResetEmail
 *
 * This file serves as a boilerplate for NestJS service unit tests with a mocked producer.
 *
 * @see AppService
 */
describe('AppService', () => {
  let service: AppService;
  let producer: jest.Mocked<EmailProducer>;

  beforeEach(async () => {
    // Create a manual mock of EmailProducer
    producer = {
      sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
      sendEmailVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordChangedEmail: jest.fn().mockResolvedValue(undefined),
      sendTwoFactorEnabledEmail: jest.fn().mockResolvedValue(undefined),
      sendTwoFactorDisabledEmail: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EmailProducer>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: EmailProducer,
          useValue: producer,
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  // ===========================================================================
  // sendUserCreatedNotification() Tests
  // ===========================================================================

  describe('sendUserCreatedNotification()', () => {
    /**
     * Test: Delegates to EmailProducer with correct email
     *
     * Scenario: A user was created with a given email
     * Expected: EmailProducer.sendWelcomeEmail is called once with that email
     */
    it('should call producer.sendWelcomeEmail with the correct email', async () => {
      // Arrange
      const email = 'user@example.com';

      // Act
      await service.sendUserCreatedNotification(email);

      // Assert
      expect(producer.sendWelcomeEmail).toHaveBeenCalledTimes(1);
      expect(producer.sendWelcomeEmail).toHaveBeenCalledWith({ email });
    });
  });

  // ===========================================================================
  // sendEmailVerificationNotification() Tests
  // ===========================================================================

  describe('sendEmailVerificationNotification()', () => {
    /**
     * Test: Delegates to EmailProducer with email and verification link
     *
     * Scenario: A user requested email verification
     * Expected: EmailProducer.sendEmailVerificationEmail is called with both args
     */
    it('should call producer.sendEmailVerificationEmail with email and link', async () => {
      // Arrange
      const email = 'user@example.com';
      const verificationLink = 'https://example.com/verify?token=abc';

      // Act
      await service.sendEmailVerificationNotification(email, verificationLink);

      // Assert
      expect(producer.sendEmailVerificationEmail).toHaveBeenCalledTimes(1);
      expect(producer.sendEmailVerificationEmail).toHaveBeenCalledWith({
        email,
        verificationLink,
      });
    });
  });

  // ===========================================================================
  // sendPasswordResetNotification() Tests
  // ===========================================================================

  describe('sendPasswordResetNotification()', () => {
    /**
     * Test: Delegates to EmailProducer with email and reset link
     *
     * Scenario: A user requested a password reset
     * Expected: EmailProducer.sendPasswordResetEmail is called with both args
     */
    it('should call producer.sendPasswordResetEmail with email and link', async () => {
      // Arrange
      const email = 'user@example.com';
      const resetLink = 'https://example.com/reset?token=xyz';

      // Act
      await service.sendPasswordResetNotification(email, resetLink);

      // Assert
      expect(producer.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      expect(producer.sendPasswordResetEmail).toHaveBeenCalledWith({
        email,
        resetLink,
      });
    });
  });
});
