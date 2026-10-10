import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '@repo/shared';
import { RoleEnum } from '@repo/shared-types';
import { CustomersController } from './customers.controller';

/**
 * Authorization is declarative: the global RolesGuard reads ROLES_KEY
 * metadata. Reads carry none (any authenticated user, via the global
 * MicroserviceAuthGuard); writes require ADMIN.
 */
describe('CustomersController metadata', () => {
  const proto = CustomersController.prototype;
  const rolesOf = (handler: keyof CustomersController) =>
    Reflect.getMetadata(ROLES_KEY, proto[handler]) as RoleEnum[] | undefined;

  it.each(['create', 'update', 'remove'] as const)(
    '%s requires the admin role',
    (handler) => {
      expect(rolesOf(handler)).toEqual([RoleEnum.ADMIN]);
    },
  );

  it.each(['list', 'findOne'] as const)(
    '%s has no role restriction',
    (handler) => {
      expect(rolesOf(handler)).toBeUndefined();
    },
  );

  it('remove responds 204', () => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, proto.remove)).toBe(204);
  });
});
