import { hash, verify } from '@node-rs/argon2';

// argon2id parameters recommended by OWASP (19 MiB, 2 iterations).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 };

export const MIN_PASSWORD_LENGTH = 12;
export const hashPassword = (password: string) => hash(password, OPTIONS);
export const verifyPassword = (passwordHash: string, password: string) => verify(passwordHash, password);
