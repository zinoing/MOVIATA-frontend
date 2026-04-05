export type ProfileUserSource = 'fetched_profile' | 'manual';

export type ProfileUser = {
  id: string;
  username: string;
  normalizedUsername: string;
  avatarUrl?: string;
  isPrimary?: boolean;
  source: ProfileUserSource;
};

export type MockFriend = ProfileUser;

export type ManualProfileInput = {
  name: string;
  username: string;
  avatarUrl?: string;
};

export type ProfileSelectionMode = 'mock' | 'manual';

export type FriendPickerTab = 'select' | 'manual';
