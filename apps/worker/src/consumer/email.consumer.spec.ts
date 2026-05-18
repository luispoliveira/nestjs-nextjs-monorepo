import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from '@repo/mail';
import type bull from 'bull';
import { EmailConsumer } from './email.consumer';

/**
 * Unit tests for EmailConsumer (Bull worker)
 *
 * Tests cover:
 * - sendWelcomeEmail() — valid job data triggers MailService.send
 * - sendWelcomeEmail() — invalid job data throws a validation error
 *
 * This file serves as a boilerplate for NestJS Bull consumer unit tests.
 * The @Processor decorator is metadata-only — the class can be tested directly.
 *
 * @see EmailConsumer
 */
describe('EmailConsumer', () => {
  let consumer: EmailConsumer;
  let mailService: jest.Mocked<MailService>;

  beforeEach(async () => {
    // Mock MailService — we only care that .send() is called correctly
    mailService = {
      send: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MailService>;

    // Silence logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailConsumer,
        {
          provide: MailService,
          useValue: mailService,
        },
      ],
    }).compile();

    consumer = module.get<EmailConsumer>(EmailConsumer);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ===========================================================================
  // sendWelcomeEmail() Tests
  // ===========================================================================

  describe('sendWelcomeEmail()', () => {
    /**
     * Test: Sends welcome email when job data is valid
     *
     * Scenario: Bull delivers a job with a valid email address
     * Expected: MailService.send is called once with the correct payload
     */
    it('should call mailService.send with the correct payload', async () => {
      // Arrange — create a mock Bull job
      const job = {
        id: 'job-1',
        data: { email: 'welcome@example.com' },
      } as bull.Job;

      // Act
      await consumer.sendWelcomeEmail(job);

      // Assert
      expect(mailService.send).toHaveBeenCalledTimes(1);
      expect(mailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [{ email: 'welcome@example.com' }],
        }),
      );
    });

    /**
     * Test: Throws when job data is invalid
     *
     * Scenario: Job payload is missing the required email field
     * Expected: Zod validation throws before MailService is called
     */
    it('should throw when job data is missing email', async () => {
      // Arrange
      const job = {
        id: 'job-2',
        data: {},
      } as bull.Job;

      // Act & Assert
      await expect(consumer.sendWelcomeEmail(job)).rejects.toThrow();
      expect(mailService.send).not.toHaveBeenCalled();
    });
  });
});
