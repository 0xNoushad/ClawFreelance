import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { apiKeys } from '@/db/schema';

import { generateApiKey } from './security';

export interface RotateKeyOptions {
  agentId: string;
  currentKeyHash: string;
  immediate?: boolean;
  gracePeriodHours?: number;
}

export interface RotateKeyResult {
  newKey: string;
  oldKeyRevokedAt: Date | null;
  gracePeriodEndsAt: Date | null;
}

/**
 * Check if a key record is still valid (not revoked, not expired, not past grace period)
 */
export function isKeyValid(keyRecord: {
  revoked: boolean;
  expiresAt: Date | null;
  gracePeriodEndsAt: Date | null;
}): boolean {
  const now = new Date();

  if (keyRecord.revoked) return false;
  if (keyRecord.expiresAt && keyRecord.expiresAt < now) return false;
  if (keyRecord.gracePeriodEndsAt && keyRecord.gracePeriodEndsAt < now) return false;

  return true;
}

/**
 * Rotate an agent's API key. Generates a new key and optionally keeps the old one
 * valid for a grace period.
 */
export async function rotateApiKey(options: RotateKeyOptions): Promise<RotateKeyResult> {
  const { agentId, currentKeyHash, immediate = false, gracePeriodHours = 24 } = options;

  const { key: newKey, hash: newKeyHash } = generateApiKey();

  const now = new Date();
  const gracePeriodEndsAt = immediate
    ? now
    : new Date(now.getTime() + gracePeriodHours * 60 * 60 * 1000);

  await db.transaction(async (tx) => {
    // Insert new API key
    await tx.insert(apiKeys).values({
      agentId,
      keyHash: newKeyHash,
      name: 'rotated-key',
      permissions: ['read', 'write', 'claim'],
      revoked: false,
    });

    // Mark old key: either revoke immediately or set grace period
    if (immediate) {
      await tx
        .update(apiKeys)
        .set({
          revoked: true,
          revokedAt: now,
        })
        .where(
          and(
            eq(apiKeys.agentId, agentId),
            eq(apiKeys.keyHash, currentKeyHash),
            eq(apiKeys.revoked, false)
          )
        );
    } else {
      await tx
        .update(apiKeys)
        .set({
          gracePeriodEndsAt,
        })
        .where(
          and(
            eq(apiKeys.agentId, agentId),
            eq(apiKeys.keyHash, currentKeyHash),
            eq(apiKeys.revoked, false)
          )
        );
    }
  });

  return {
    newKey,
    oldKeyRevokedAt: immediate ? now : null,
    gracePeriodEndsAt: immediate ? null : gracePeriodEndsAt,
  };
}

/**
 * Immediately revoke all API keys for an agent (emergency use)
 */
export async function revokeAllKeys(agentId: string): Promise<number> {
  const now = new Date();
  const result = await db
    .update(apiKeys)
    .set({
      revoked: true,
      revokedAt: now,
      gracePeriodEndsAt: null,
    })
    .where(and(eq(apiKeys.agentId, agentId), eq(apiKeys.revoked, false)))
    .returning();

  return result.length;
}
