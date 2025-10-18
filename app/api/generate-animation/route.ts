import { fal } from '@fal-ai/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
	try {
		const { imageUrls, fps = 8, apiKey } = await request.json()

		// Validate inputs
		if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length < 2) {
			return NextResponse.json(
				{ success: false, error: 'Need at least 2 image URLs' },
				{ status: 400 }
			)
		}

		if (!apiKey) {
			return NextResponse.json({ success: false, error: 'API key is required' }, { status: 400 })
		}

		// Configure fal.ai client
		fal.config({ credentials: apiKey })

		// Use the first image as the base and create a prompt for animation
		const firstImageUrl = imageUrls[0]

		// Call fal.ai video model for image-to-video
		// Using kling-video as it's more suitable for image sequences
		const result = await fal.subscribe('fal-ai/kling-video/v1/standard/image-to-video', {
			input: {
				prompt: 'smooth animation sequence, character movement, consistent style',
				image_url: firstImageUrl,
				duration: '5',
				aspect_ratio: '16:9',
			},
			logs: true,
			onQueueUpdate: (update: any) => {
				if (update.status === 'IN_PROGRESS') {
					console.log('Video generation in progress...', update)
				}
			},
		})

		// Extract the video URL from the result
		const videoUrl = result.data.video.url

		return NextResponse.json({
			success: true,
			videoUrl: videoUrl,
		})
	} catch (error: any) {
		console.error('Error generating animation:', error)
		return NextResponse.json(
			{
				success: false,
				error: error.message || 'Failed to generate animation',
			},
			{ status: 500 }
		)
	}
}
