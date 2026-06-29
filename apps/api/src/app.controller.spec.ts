import { Test, TestingModule } from '@nestjs/testing';
import { CustomThrottlerGuard } from '@repo/shared';
import { AppController } from './app.controller';

/**
 * Unit tests for AppController
 *
 * Tests cover:
 * - GET / — returns hello world string
 *
 * This file serves as a boilerplate for NestJS controller unit tests.
 * Copy this pattern when adding tests for new controllers.
 *
 * @see AppController
 */
describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    // Build a minimal test module with only the controller under test.
    // Add mocked providers here when the controller has dependencies.
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    })
      .overrideGuard(CustomThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AppController>(AppController);
  });

  // ===========================================================================
  // getHello() Tests
  // ===========================================================================

  describe('getHello()', () => {
    /**
     * Test: Returns greeting string
     *
     * Scenario: GET / is called
     * Expected: Returns 'Hello, world!'
     */
    it('should return "Hello, world!"', () => {
      // Act
      const result = controller.getHello();

      // Assert
      expect(result).toBe('Hello, world!');
    });
  });
});
