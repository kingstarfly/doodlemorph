import { PostHog } from 'posthog-node'

// Singleton PostHog client for server-side tracking
let posthogClient: PostHog | null = null

export function getPostHogClient(): PostHog {
	if (!posthogClient) {
		const apiKey = process.env.POSTHOG_API_KEY
		if (!apiKey) {
			console.warn('POSTHOG_API_KEY not found in environment variables')
			// Return a mock client that does nothing if no API key
			return {
				capture: () => {},
				shutdown: async () => {},
			} as unknown as PostHog
		}

		posthogClient = new PostHog(apiKey, {
			host: 'https://us.i.posthog.com',
			flushAt: 1, // Send events immediately for server-side tracking
			flushInterval: 0, // Don't batch events
		})
	}

	return posthogClient
}

// Helper function to track generation events
export function trackGenerationEvent(event: string, properties: Record<string, any>): void {
	try {
		const posthog = getPostHogClient()
		posthog.capture({
			distinctId: 'server-generation',
			event,
			properties: {
				...properties,
				timestamp: new Date().toISOString(),
			},
		})
	} catch (error) {
		console.error('Error tracking PostHog event:', error)
		// Don't throw - tracking failures shouldn't break the API
	}
}
