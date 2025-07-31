import { useEffect, useRef } from 'react';
import { addUserTokenRequestListener } from './addUserTokenRequestListener';

/**
 * A function that provides user tokens for authentication.
 *
 * @returns A promise that resolves to a valid user token string.
 * @throws Should throw an error if the token cannot be provided (e.g., user not logged in).
 */
export type UserTokenProvider = () => Promise<string>;

/**
 * React hook that registers a user token provider for SSO authentication.
 *
 * This hook automatically handles token requests from the Octopus SDK by calling
 * the provided `userTokenProvider` function whenever a fresh token is needed.
 * The hook manages the subscription lifecycle and ensures the latest token provider
 * is always used.
 */
export function useUserTokenProvider(userTokenProvider: UserTokenProvider) {
  const userTokenProviderRef = useRef(userTokenProvider);

  useEffect(() => {
    userTokenProviderRef.current = userTokenProvider;
  }, [userTokenProvider]);

  useEffect(() => {
    const subscription = addUserTokenRequestListener(() =>
      userTokenProviderRef.current()
    );

    return () => {
      subscription.remove();
    };
  }, []);
}
