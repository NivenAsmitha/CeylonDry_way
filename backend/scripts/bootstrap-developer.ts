import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { argon2id, hash as hashPassword } from 'argon2';
import { isEmail } from 'class-validator';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { PrismaClient, RoleName } from '../src/generated/prisma/client.js';
import { assertAllowedRoleCombination } from '../src/modules/roles/role-combination.policy.js';

function maskEmail(email: string): string {
  const [local = '', domain = 'invalid'] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}

function hasPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

function assertStrongPassword(
  password: string,
  email: string,
  name: string,
): void {
  const normalizedPassword = password.toLowerCase();
  const emailLocalPart = email.split('@')[0]?.toLowerCase() ?? '';
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const strong =
    password.length >= 16 &&
    password.length <= 128 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
  const containsIdentity =
    (emailLocalPart.length >= 3 &&
      normalizedPassword.includes(emailLocalPart)) ||
    (normalizedName.length >= 3 && normalizedPassword.includes(normalizedName));

  if (!strong || containsIdentity) {
    throw new Error(
      'Password must be 16-128 characters with upper/lowercase letters, a number, a symbol, and no email/name fragment.',
    );
  }
}

function readHidden(prompt: string): Promise<string> {
  if (!stdin.isTTY || !stdout.isTTY || !stdin.setRawMode) {
    return Promise.reject(
      new Error('Developer bootstrap requires an interactive terminal.'),
    );
  }

  return new Promise((resolve, reject) => {
    let value = '';
    stdout.write(prompt);
    stdin.setEncoding('utf8');
    stdin.setRawMode(true);
    stdin.resume();

    const cleanup = (): void => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
    };
    const onData = (chunk: string): void => {
      for (const character of chunk) {
        if (character === '\u0003') {
          cleanup();
          reject(new Error('Developer bootstrap cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          resolve(value);
          return;
        }
        if (character === '\u007f' || character === '\b') {
          value = value.slice(0, -1);
        } else if (character >= ' ') {
          value += character;
        }
      }
    };

    stdin.on('data', onData);
  });
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not configured.');
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error('Developer bootstrap requires explicit terminal input.');
  }

  assertAllowedRoleCombination([RoleName.DEVELOPER]);
  const readline = createInterface({ input: stdin, output: stdout });
  const email = (await readline.question('Developer email: '))
    .trim()
    .toLowerCase();
  const name = (await readline.question('Developer display name: ')).trim();
  const confirmation = await readline.question(
    'Type CREATE DEVELOPER to continue: ',
  );
  readline.close();

  if (!isEmail(email) || name.length < 2 || name.length > 100) {
    throw new Error('A valid email and 2-100 character name are required.');
  }
  if (confirmation !== 'CREATE DEVELOPER') {
    throw new Error('Developer bootstrap cancelled.');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

  try {
    const [existingUser, developerRole] = await Promise.all([
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
      prisma.role.findUnique({
        where: { name: RoleName.DEVELOPER },
        select: { id: true },
      }),
    ]);

    if (existingUser) {
      throw new Error('An account with this normalized email already exists.');
    }
    if (!developerRole) {
      throw new Error('The DEVELOPER role is not configured. Run the seed.');
    }

    const password = await readHidden('Strong password (input hidden): ');
    const confirmationPassword = await readHidden(
      'Confirm password (input hidden): ',
    );
    if (password !== confirmationPassword) {
      throw new Error('Passwords do not match.');
    }
    assertStrongPassword(password, email, name);
    const passwordHash = await hashPassword(password, { type: argon2id });

    await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          email,
          name,
          passwordHash,
          roles: {
            create: {
              role: { connect: { id: developerRole.id } },
              systemReason: 'CONTROLLED_DEVELOPER_BOOTSTRAP',
            },
          },
        },
        select: { id: true },
      });

      await transaction.auditLog.create({
        data: {
          actorId: user.id,
          action: 'DEVELOPER_BOOTSTRAPPED',
          targetType: 'User',
          targetId: user.id,
          afterSummary: { roles: [RoleName.DEVELOPER] },
        },
      });
    });

    console.log(`DEVELOPER-only account created for ${maskEmail(email)}.`);
  } catch (error: unknown) {
    if (hasPrismaErrorCode(error, 'P2002')) {
      throw new Error('An account with this normalized email already exists.');
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Developer bootstrap failed.',
  );
  process.exitCode = 1;
});
