import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});

/**
 * Clears all cached queries and mutations.
 * Used during auth transitions (login/logout/user switch)
 * to prevent data leaks between user sessions.
 */
export function resetQueryCache() {
	queryClientInstance.clear();
}