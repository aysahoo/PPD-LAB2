/**
 * Runs before test files. Ensures `env` parses when modules load.
 * Override with real `DATABASE_URL` for `RUN_DB_INTEGRATION=1` tests.
 */
process.env.NODE_ENV ??= "test";
process.env.LOG_LEVEL ??= "silent";
process.env.JWT_SECRET ??= "test-jwt-secret-must-be-at-least-32-chars";
process.env.CLIENT_ORIGIN ??= "http://localhost:5173";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:5432/postgres";
process.env.PORT ??= "3000";
