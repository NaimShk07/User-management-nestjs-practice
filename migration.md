# NestJS Migration Plan

This document is a detailed migration blueprint for moving the current Express + TypeScript backend into a NestJS application while preserving all existing features, API behavior, and project conventions.

---

## 1. Migration Goal

The target is to transform the current project into a NestJS backend that keeps the same core capabilities:

- JWT authentication with access and refresh tokens
- Google OAuth login
- role-based authorization
- MySQL database integration
- request validation
- security middleware
- structured error handling
- test coverage and quality tooling

The migration should be done in a gradual, low-risk way instead of a big-bang rewrite.

---

## 2. Current Features to Preserve in NestJS

### Authentication Features

The NestJS version should support:

- user signup
- user login
- access token verification
- refresh token rotation
- logout flow
- protected routes using bearer token
- cookie-based refresh token storage
- Google OAuth login and callback flow

### User Management Features

The NestJS app should preserve:

- create user
- get all users
- get user by id
- update user
- delete user
- admin-only protected operations

### Security Features

These must be migrated carefully:

- Helmet for secure HTTP headers
- CORS with credentials support
- cookie parser for refresh token handling
- request rate limiting
- login rate limiting
- global error handling

### Validation Features

The NestJS version should keep:

- Zod-style input validation
- request body validation for auth and user routes
- structured validation errors

### Database Features

The backend should continue to support:

- MySQL connection
- repository-style database access
- startup database verification
- schema-based table creation using SQL

### Developer Experience Features

The NestJS project should still include:

- TypeScript support
- ESLint and Prettier
- Husky pre-commit checks
- test scripts
- environment-based configuration

---

## 3. Current Project Structure Mapping

The existing project structure can be mapped to NestJS in a clean way:

### Existing folders

- `src/config/` → Nest config and provider setup
- `src/controllers/` → Nest controllers
- `src/services/` → Nest services
- `src/repositories/` → Nest providers or repository services
- `src/routes/` → replaced by Nest controllers and route decorators
- `src/middlewares/` → replaced by guards, interceptors, and filters
- `src/schemas/` → DTOs and validation schemas
- `src/utils/` → shared utilities and helpers
- `src/types/` → shared TypeScript interfaces and types

### Proposed NestJS structure

```text
src/
  app.module.ts
  main.ts
  common/
    filters/
    guards/
    interceptors/
    decorators/
    utils/
  config/
    config.module.ts
    database.module.ts
    passport.module.ts
  auth/
    auth.module.ts
    auth.controller.ts
    auth.service.ts
    dto/
    strategies/
    guards/
  users/
    users.module.ts
    users.controller.ts
    users.service.ts
    dto/
    repositories/
  database/
    database.service.ts
    mysql.provider.ts
```

---

## 4. Tools and Packages to Add

### Core NestJS packages

- `@nestjs/common`
- `@nestjs/core`
- `@nestjs/platform-express`
- `@nestjs/config`
- `@nestjs/jwt`
- `@nestjs/passport`
- `@nestjs/throttler`
- `@nestjs/swagger` (optional for API docs)
- `@nestjs/testing`

### Validation and transformation

- `class-validator`
- `class-transformer`

### Authentication and security

- `passport`
- `passport-jwt`
- `passport-google-oauth20`
- `cookie-parser`
- `helmet`
- `cors`
- `express-rate-limit`

### Database and utilities

- `mysql2`
- `bcrypt`
- `jsonwebtoken`
- `zod`

### Existing development tools to keep

- TypeScript
- ESLint
- Prettier
- Husky
- tsx or Nest CLI-based dev workflow

---

## 5. Migration Phases

### Phase 1: Prepare the baseline

Actions:

- create a dedicated branch for migration
- keep the current Express project working
- inventory all current routes, services, and middleware
- record environment variables and expected behavior
- preserve test cases before changing architecture

Deliverable:

- a complete migration checklist based on the current app

### Phase 2: Create the NestJS skeleton

Actions:

- install NestJS dependencies
- create `main.ts` and `app.module.ts`
- configure global prefix such as `/api`
- enable CORS, Helmet, cookie parser, and validation pipe
- bootstrap a basic Nest app that serves the current routes

Deliverable:

- a working NestJS app that boots successfully

### Phase 3: Migrate authentication module

Actions:

- create `AuthModule`
- move signup, login, refresh, logout, and Google OAuth into Nest controllers/services
- implement auth guards for protected routes
- use Nest strategies for JWT and Google OAuth
- preserve token and cookie behavior

Deliverable:

- auth routes mirrored from the current API

### Phase 4: Migrate user module

Actions:

- create `UsersModule`
- move CRUD routes into a Nest controller
- move business logic into a service
- keep role-based access protection
- preserve response structure and error behavior

Deliverable:

- user routes working under NestJS

### Phase 5: Migrate validation layer

Actions:

- replace or wrap the existing Zod validation flow
- create DTO classes for auth and user requests
- use Nest validation pipes globally
- keep friendly validation error messages

Deliverable:

- input validation consistent with the current API

### Phase 6: Migrate database layer

Actions:

- move database connection logic into a Nest provider/service
- keep the repository pattern if desired
- inject repositories into services
- preserve MySQL queries and schema expectations

Deliverable:

- same database behavior under NestJS

### Phase 7: Replace middleware with Nest-native features

Actions:

- convert auth middleware into guards
- convert role checks into guards
- convert error middleware into exception filters
- keep the same API responses where possible

Deliverable:

- more idiomatic NestJS architecture

### Phase 8: Migrate tests and quality tooling

Actions:

- rewrite tests using Nest testing utilities
- keep existing integration coverage goals
- update scripts for Nest development
- ensure linting and formatting remain intact

Deliverable:

- test suite and development workflow fully working in NestJS

---

## 6. Recommended NestJS Module Design

### Auth Module

Responsibilities:

- signup
- login
- refresh token
- logout
- Google OAuth flow
- token generation and verification

Suggested files:

- `auth.module.ts`
- `auth.controller.ts`
- `auth.service.ts`
- `dto/login.dto.ts`
- `dto/signup.dto.ts`
- `dto/refresh.dto.ts`
- `strategies/jwt.strategy.ts`
- `strategies/google.strategy.ts`
- `guards/jwt-auth.guard.ts`
- `guards/roles.guard.ts`

### Users Module

Responsibilities:

- list users
- get single user
- create user
- update user
- delete user
- role-based access control

Suggested files:

- `users.module.ts`
- `users.controller.ts`
- `users.service.ts`
- `dto/create-user.dto.ts`
- `dto/update-user.dto.ts`
- `repositories/user.repository.ts`

### Common Module

Responsibilities:

- shared utilities
- custom decorators
- custom exceptions
- shared response types
- common filters and pipes

### Config Module

Responsibilities:

- environment variables
- database configuration
- JWT secrets
- Google OAuth credentials

---

## 7. Feature-by-Feature Migration Checklist

### Feature: Authentication

- [ ] signup endpoint
- [ ] login endpoint
- [ ] access token validation
- [ ] refresh token flow
- [ ] logout endpoint
- [ ] Google OAuth route and callback
- [ ] token expiration handling

### Feature: Authorization

- [ ] authenticated user guard
- [ ] role-based authorization guard
- [ ] admin-only access rules
- [ ] protected user routes

### Feature: Validation

- [ ] signup validation
- [ ] login validation
- [ ] update user validation
- [ ] global validation pipeline

### Feature: Database

- [ ] MySQL connection setup
- [ ] repository pattern support
- [ ] startup health check
- [ ] schema-based initialization

### Feature: Security

- [ ] Helmet setup
- [ ] CORS setup
- [ ] rate limiting
- [ ] login throttling
- [ ] secure cookie handling

### Feature: Error Handling

- [ ] centralized exception handling
- [ ] consistent API error response format
- [ ] validation error formatting

### Feature: Testing

- [ ] auth tests
- [ ] user tests
- [ ] unauthorized access tests
- [ ] refresh token tests
- [ ] database integration tests

### Feature: Developer Experience

- [ ] Nest CLI workflow
- [ ] environment configuration
- [ ] linting and formatting
- [ ] Husky hooks

---

## 8. Suggested Migration Order

1. Create the NestJS app shell
2. Add config, database, and app bootstrap
3. Migrate auth routes first
4. Migrate user routes second
5. Replace middleware with guards and filters
6. Move validation to DTOs and pipes
7. Update tests and scripts
8. Refactor for idiomatic NestJS architecture

---

## 9. Recommended Implementation Strategy

The safest approach is:

- keep the business logic and database access mostly unchanged at first
- wrap existing behavior inside Nest controllers and services
- gradually replace Express-specific middleware with Nest guards, filters, and pipes
- preserve endpoint names and response shapes during the transition

This reduces risk and makes the migration easier to test step by step.

---

## 10. Final Target State

When the migration is complete, the project should feel like a proper NestJS application with:

- modular architecture
- dependency injection
- controller/service/repository separation
- built-in validation and exception handling
- clean auth and authorization flow
- maintainable folder structure
- same external API behavior as the current project

---

## 11. Recommended Milestones

- [ ] NestJS app boots successfully
- [ ] auth endpoints work exactly as before
- [ ] user endpoints work exactly as before
- [ ] JWT auth and refresh flow work
- [ ] Google OAuth works
- [ ] rate limiting and security middleware work
- [ ] tests pass
- [ ] API remains compatible with the frontend
