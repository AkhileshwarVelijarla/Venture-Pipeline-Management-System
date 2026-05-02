import bcrypt from "bcryptjs";

export type CredentialsInput = {
  email?: string;
  password?: string;
};

export type CredentialsUser = {
  id: string;
  email: string | null;
  name: string | null;
  role?: string | null;
  passwordHash?: string | null;
};

export type AuthorizedUser = {
  id: string;
  email: string | null;
  name?: string;
  role?: string;
};

export type FindCredentialsUser = (where: {
  email?: string;
  id?: string;
}) => Promise<CredentialsUser | null>;

export async function authorizeCredentials(
  creds: CredentialsInput | undefined,
  findUser: FindCredentialsUser,
): Promise<AuthorizedUser | null> {
  if (!creds?.email || !creds?.password) return null;

  const identifier = String(creds.email).trim();
  const isEmail = identifier.includes("@");
  const key = isEmail
    ? { email: identifier.toLowerCase() }
    : { id: identifier };

  const user = await findUser(key);
  if (!user?.passwordHash) return null;

  const ok = await bcrypt.compare(String(creds.password), user.passwordHash);
  if (!ok) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name || undefined,
    role: user.role || undefined,
  };
}
