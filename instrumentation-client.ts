import posthog from 'posthog-js'

console.log('process.env.NEXT_PUBLIC_POSTHOG_KEY', process.env.NEXT_PUBLIC_POSTHOG_KEY)
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
	api_host: '/api/app-insights',
	ui_host: 'https://us.posthog.com',
	defaults: '2025-05-24',
	capture_exceptions: true, // This enables capturing exceptions using Error Tracking, set to false if you don't want this
	debug: process.env.NODE_ENV === 'development',
})
