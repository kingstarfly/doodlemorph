import { fal } from '@fal-ai/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// Define request schema with Zod
const GenerateAnimationSchema = z.object({
	imageUrl: z.string().url('Must be a valid URL'),
	prompt: z
		.string()
		.min(1)
		.max(500)
		.default('smooth animation sequence, character movement, consistent style, natural motion'),
	duration: z.enum(['4', '8', '12']).default('4'),
	aspectRatio: z.enum(['auto', '9:16', '16:9']).default('auto'),
	resolution: z.enum(['auto', '720p']).default('auto'),
	openaiApiKey: z.string().nullable(),
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

		const { imageUrl, prompt, duration, aspectRatio, resolution, openaiApiKey } = validation.data

		// ONLY use OpenAI key (prefer user-submitted over environment variable)
		const finalOpenaiApiKey = openaiApiKey ?? OPENAI_API_KEY
		if (!finalOpenaiApiKey) {
			return NextResponse.json(
				{ success: false, error: 'OpenAI API key is required for Sora 2 animation' },
				{ status: 400 }
			)
		}

		// Configure fal.ai client with OpenAI key
		fal.config({ credentials: finalOpenaiApiKey })

		// Call fal.ai Sora 2 model for image-to-video
		const result = await fal.subscribe('fal-ai/sora-2/image-to-video', {
			input: {
				prompt: prompt,
				image_url: imageUrl,
				duration: duration,
				aspect_ratio: aspectRatio,
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
		return NextResponse.json(
			{
				success: false,
				error: error.message || 'Failed to generate animation',
			},
			{ status: 500 }
		)
	}
}
