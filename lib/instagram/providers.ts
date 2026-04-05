export type FetchedInstagramProfile = {
  normalizedHandle: string;
  displayHandle: string;
  externalAvatarUrl: string;
  provider: string;
};

export interface InstagramProfileProvider {
  fetchProfile(handle: string): Promise<FetchedInstagramProfile>;
}

export class MockInstagramProfileProvider implements InstagramProfileProvider {
  async fetchProfile(handle: string): Promise<FetchedInstagramProfile> {
    if (handle === 'private_account') {
      throw new Error('PRIVATE_OR_UNAVAILABLE');
    }

    if (handle === 'missing_profile') {
      throw new Error('PROFILE_NOT_FOUND');
    }

    return {
      normalizedHandle: handle,
      displayHandle: `@${handle}`,
      externalAvatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(handle)}`,
      provider: 'mock-provider',
    };
  }
}

export class InstagramProfileFetchService {
  constructor(private providers: InstagramProfileProvider[]) {}

  async fetch(handle: string) {
    let lastError: unknown;

    for (const provider of this.providers) {
      try {
        return await provider.fetchProfile(handle);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error('UNKNOWN_FETCH_ERROR');
  }
}
