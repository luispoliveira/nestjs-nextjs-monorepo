# NestJS Test Generator — Agent Memory

## ⚠️ Known Pitfalls

### Pitfall: NodeNext module resolution incompatible with ts-jest v29

- **Context**: Monorepo using `packages/typescript-config/nestjs.json` with `module: "NodeNext"` and `moduleResolution: "NodeNext"`.
- **What went wrong**: ts-jest v29 cannot resolve imports under `NodeNext`/`Node16` — test suite fails to run.
- **Fix/Avoid**: Create a `tsconfig.test.json` per app that overrides to `module: "commonjs"` and `moduleResolution: "node"`, and add `"ignoreDeprecations": "6.0"` (required by TypeScript 6 which deprecated the `node` alias). Point ts-jest at it via `["ts-jest", { "tsconfig": "<rootDir>/../tsconfig.test.json" }]` in the jest transform config.
- **Project**: nestjs-nextjs-monorepo
- **Date**: 2026-05-18

### Pitfall: ESM-only packages in node_modules fail with CJS Jest

- **Context**: `@thallesp/nestjs-better-auth` ships as ESM (`.mjs`). When the `auth` controller imports it, Jest throws `SyntaxError: Cannot use import statement outside a module`.
- **What went wrong**: `transformIgnorePatterns` does NOT work with pnpm virtual store — the package lives at `node_modules/.pnpm/@thallesp+nestjs-better-auth@.../node_modules/...` so the standard pattern `node_modules/(?!(pkg)/)` never matches.
- **Fix/Avoid**: Use `jest.mock('package-name', () => ({ ... }))` with a factory at the top of the spec file. The factory completely replaces the module — no real ESM file is loaded. Do NOT use `transformIgnorePatterns` for pnpm workspaces.
- **Project**: nestjs-nextjs-monorepo
- **Date**: 2026-05-18

---

## ✅ Successful Patterns

### Pattern: tsconfig.test.json override for NodeNext projects

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "resolvePackageJsonExports": false,
    "ignoreDeprecations": "6.0"
  }
}
```

Pair with this jest transform in `package.json`:

```json
"transform": {
  "^.+\\.(t|j)s$": ["ts-jest", { "tsconfig": "<rootDir>/../tsconfig.test.json" }]
}
```

### Pattern: Minimal controller unit test boilerplate

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyController } from './my.controller';

describe('MyController', () => {
  let controller: MyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MyController],
    }).compile();

    controller = module.get<MyController>(MyController);
  });

  describe('methodName()', () => {
    it('should ...', () => {
      expect(controller.methodName()).toBe('expected');
    });
  });
});
```

---

## 📋 Project-Specific Notes

### Project: nestjs-nextjs-monorepo

- **TypeScript version**: 6.x — deprecated `node` module resolution alias; always add `"ignoreDeprecations": "6.0"` when using `moduleResolution: "node"` in test configs.
- **Jest version**: 30.x
- **ts-jest version**: 29.x (not yet updated to match jest 30 major — still works, minor warnings possible)
- **No mocking libraries pre-installed**: `@golevelup/ts-jest` and `jest-mock-extended` are NOT in devDependencies. Install them before writing service/repository tests.
- **ORM**: Prisma 7 via `@repo/database` — mock via `jest-mock-extended`.
- **Auth**: `better-auth` — never use Passport/JWT mocks.
- **Shared module**: `SharedModule.register()` pulls in heavy infrastructure (DB, Redis, Mongo). In unit tests, do NOT import `AppModule` — use minimal `Test.createTestingModule` with only the unit under test.
- **Per-app jest config**: Each NestJS app (`apps/api`, `apps/auth`, etc.) has its jest config embedded in its own `package.json`. The `tsconfig.test.json` override must be created per app.
