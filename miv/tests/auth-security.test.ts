import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

import { authorizeCredentials } from "../lib/credentials-auth";
import { getBackendAuthSecret } from "../lib/backend-auth";

const user = {
  id: "user-1",
  email: "admin@example.com",
  name: "Admin User",
  role: "ADMIN",
};

test("login with a valid email and correct real password works", async () => {
  const passwordHash = await bcrypt.hash("real-password", 10);

  const result = await authorizeCredentials(
    { email: "ADMIN@example.com", password: "real-password" },
    async (where) => {
      assert.deepEqual(where, { email: "admin@example.com" });
      return { ...user, passwordHash };
    },
  );

  assert.deepEqual(result, {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
});

test("login with a valid email and wrong password fails", async () => {
  const passwordHash = await bcrypt.hash("real-password", 10);

  const result = await authorizeCredentials(
    { email: user.email, password: "wrong-password" },
    async () => ({ ...user, passwordHash }),
  );

  assert.equal(result, null);
});

test('login with passwordHash null and password "admin123" fails', async () => {
  const result = await authorizeCredentials(
    { email: user.email, password: "admin123" },
    async () => ({ ...user, passwordHash: null }),
  );

  assert.equal(result, null);
});

test("login with passwordHash null and any password fails", async () => {
  const result = await authorizeCredentials(
    { email: user.email, password: "another-password" },
    async () => ({ ...user, passwordHash: null }),
  );

  assert.equal(result, null);
});

test("backend auth secret throws a clear error when missing", () => {
  assert.throws(
    () => getBackendAuthSecret({}),
    /BACKEND_AUTH_SECRET is required and must be set in environment variables\./,
  );
});

test("backend auth secret is returned when provided", () => {
  assert.equal(
    getBackendAuthSecret({ BACKEND_AUTH_SECRET: "secure-secret" }),
    "secure-secret",
  );
});
