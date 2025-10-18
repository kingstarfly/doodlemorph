import { fal } from '@fal-ai/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const FAL_API_KEY = process.env.FAL_API_KEY

// Define request schema with Zod
// Constant prompt suffix to ensure consistent quality and framing
const QUALITY_PROMPT_SUFFIX =
	', keep full character visible in frame, never crop or cut off the character, maintain proper spacing around character, add background space if needed, smooth animation sequence, consistent style, natural motion'

const GenerateAnimationSchema = z.object({
	imageUrl: z.string().url('Must be a valid URL'),
	prompt: z.string().min(1).max(500).default('character movement'),
	duration: z.coerce
		.number()
		.int()
		.refine((val) => [4, 8, 12].includes(val), {
			message: 'Duration must be 4, 8, or 12 seconds',
		})
		.default(4),
	resolution: z.enum(['auto', '720p']).default('auto'),
})

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()

		// Validate and parse input with Zod
		const validation = GenerateAnimationSchema.safeParse(body)
		if (!validation.success) {
			return NextResponse.json(
				{
					success: false,
					error: 'Invalid input',
					details: validation.error.issues,
				},
				{ status: 400 }
			)
		}
		console.log('Validation data:', validation.data)

		const { imageUrl, prompt, duration, resolution } = validation.data

		// Check for FAL API key in environment variables
		if (!FAL_API_KEY) {
			return NextResponse.json(
				{ success: false, error: 'FAL API key is not configured on the server' },
				{ status: 500 }
			)
		}

		// Configure fal.ai client with FAL key
		fal.config({ credentials: FAL_API_KEY })

		// Combine user prompt with quality suffix
		const finalPrompt = prompt + QUALITY_PROMPT_SUFFIX

		// Call fal.ai Sora 2 model for image-to-video
		const result = await fal.subscribe('fal-ai/sora-2/image-to-video', {
			input: {
				prompt: finalPrompt,
				image_url: imageUrl,
				duration: duration as any, // API expects number but types say string
				aspect_ratio: '16:9',
				resolution: resolution,
			},
			logs: true,
			onQueueUpdate: (update: any) => {
				if (update.status === 'IN_PROGRESS') {
					console.log('Sora 2 video generation in progress...', update)
					if (update.logs) {
						update.logs.map((log: any) => log.message).forEach(console.log)
					}
				}
			},
		})

		// Extract the video URL from the result
		const videoUrl = result.data.video.url
		const videoId = result.data.video_id

		return NextResponse.json({
			success: true,
			videoUrl: videoUrl,
			videoId: videoId,
			requestId: result.requestId,
		})
	} catch (error: any) {
		console.error('Error generating animation with Sora 2:', error)
		console.error('Error details:', JSON.stringify(error, null, 2))
		return NextResponse.json(
			{
				success: false,
				error: error.message || 'Failed to generate animation',
			},
			{ status: 500 }
		)
	}
}
