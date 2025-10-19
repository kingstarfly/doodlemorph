/** @type {import('next').NextConfig} */
const nextConfig = {
	transpilePackages: ['tldraw'],
	async rewrites() {
		return [
			{
				source: '/api/app-insights/static/:path*',
				destination: 'https://us-assets.i.posthog.com/static/:path*',
			},
			{
				source: '/api/app-insights/:path*',
				destination: 'https://us.i.posthog.com/:path*',
			},
		]
	},
	// This is required to support PostHog trailing slash API requests
	skipTrailingSlashRedirect: true,
}

module.exports = nextConfig