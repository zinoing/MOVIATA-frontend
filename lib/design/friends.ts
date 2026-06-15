import { fetchInstagramProfile, validateInstagramHandleInput } from '../instagram/profile';
import { createProfileUser, dedupeProfileUsers, hasProfileUser } from '../profileUsers';
import type { ProfileUser } from '../../types/profile';

export async function addManualProfileUser(
  users: ProfileUser[],
  username: string,
): Promise<ProfileUser[]> {
  const validation = validateInstagramHandleInput(username);
  if (!validation.isValid) {
    return users;
  }

  if (hasProfileUser(users, validation.normalizedHandle)) {
    return dedupeProfileUsers(users);
  }

  try {
    const profile = await fetchInstagramProfile(validation.normalizedHandle);
    return dedupeProfileUsers([
      ...users,
      createProfileUser('fetched_profile', profile.normalizedHandle, profile.avatarUrl, false),
    ]);
  } catch {
    return dedupeProfileUsers([
      ...users,
      createProfileUser('manual', validation.normalizedHandle, '', false),
    ]);
  }
}
