import type { ProfileUser, ProfileUserSource } from '../types/profile';
import { normalizeInstagramHandle } from './instagram/handle';

export function normalizeProfileUsername(username: string): string {
  return normalizeInstagramHandle(username);
}

export function createProfileUserId(source: ProfileUserSource, username: string): string {
  return `${source}:${normalizeProfileUsername(username)}`;
}

export function createProfileUser(source: ProfileUserSource, username: string, avatarUrl = '', isPrimary = false): ProfileUser {
  const normalizedUsername = normalizeProfileUsername(username);

  return {
    id: createProfileUserId(source, normalizedUsername),
    username: normalizedUsername,
    normalizedUsername,
    avatarUrl,
    isPrimary,
    source,
  };
}

function getProfileUserPriority(user: ProfileUser) {
  return [
    user.isPrimary ? 1 : 0,
    user.source === 'fetched_profile' ? 1 : 0,
    user.avatarUrl ? 1 : 0,
  ] as const;
}

function isHigherPriorityProfileUser(candidate: ProfileUser, current: ProfileUser) {
  const candidatePriority = getProfileUserPriority(candidate);
  const currentPriority = getProfileUserPriority(current);

  for (let index = 0; index < candidatePriority.length; index += 1) {
    if (candidatePriority[index] !== currentPriority[index]) {
      return candidatePriority[index] > currentPriority[index];
    }
  }

  return candidate.id < current.id;
}

export function dedupeProfileUsers(users: ProfileUser[]): ProfileUser[] {
  const byNormalizedUsername = new Map<string, ProfileUser>();

  for (const user of users) {
    const normalizedUsername = normalizeProfileUsername(user.normalizedUsername || user.username || user.id);
    if (!normalizedUsername) {
      continue;
    }

    const normalizedUser = {
      ...user,
      id: createProfileUserId(user.source, normalizedUsername),
      username: normalizedUsername,
      normalizedUsername,
    };

    const current = byNormalizedUsername.get(normalizedUsername);
    if (!current || isHigherPriorityProfileUser(normalizedUser, current)) {
      byNormalizedUsername.set(normalizedUsername, normalizedUser);
    }
  }

  return Array.from(byNormalizedUsername.values()).sort((left, right) => {
    const leftPriority = getProfileUserPriority(left);
    const rightPriority = getProfileUserPriority(right);

    for (let index = 0; index < leftPriority.length; index += 1) {
      if (leftPriority[index] !== rightPriority[index]) {
        return rightPriority[index] - leftPriority[index];
      }
    }

    return left.normalizedUsername.localeCompare(right.normalizedUsername);
  });
}

export function hasProfileUser(users: ProfileUser[], username: string): boolean {
  const normalized = normalizeProfileUsername(username);
  return users.some((user) => normalizeProfileUsername(user.normalizedUsername || user.username || user.id) === normalized);
}
