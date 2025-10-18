import { fal } from '@fal-ai/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const FAL_API_KEY = process.env.FAL_API_KEY

// Define request schema with Zod
// Constant prompt suffix to ensure consistent quality and framing
const QUALITY_PROMPT_SUFFIX =
	', keep full character visible in frame, never crop or cut off the character, maintain proper spacing around character, add background space if needed, smooth animation sequence, consistent style, natural motion'

const AUDIO_PROMPT_SUFFIX = ', include appropriate sound effects of the subject while it moves'

const GenerateAnimationSchema = z.object({
	imageUrl: z.string().url('Must be a valid URL'),
	prompt: z.string().min(1).max(500).default('character movement'),
	generateAudio: z.boolean().optional().default(false),
	aspectRatio: z.enum(['16:9', '9:16']).optional().default('16:9'),
	resolution: z.enum(['720p', '1080p']).optional().default('720p'),
})

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()

		console.log('Body:', body)

		// Validate and parse input with Zod
		const validation = GenerateAnimationSchema.safeParse(body)
		if (!validation.success) {
			console.log('Validation error:', validation.error.issues)
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

		const { imageUrl, prompt, generateAudio, aspectRatio, resolution } = validation.data

		// Check for FAL API key in environment variables
		if (!FAL_API_KEY) {
			return NextResponse.json(
				{ success: false, error: 'FAL API key is not configured on the server' },
				{ status: 500 }
			)
		}

		// Configure fal.ai client with FAL key
		fal.config({ credentials: FAL_API_KEY })

		// Combine user prompt with quality suffix and audio suffix if needed
		let finalPrompt = prompt + QUALITY_PROMPT_SUFFIX
		if (generateAudio) {
			finalPrompt += AUDIO_PROMPT_SUFFIX
		}

		// Call fal.ai veo3.1 fast model for image-to-video (duration is 8s by default)
		const result = await fal.subscribe('fal-ai/veo3.1/fast/image-to-video', {
			input: {
				prompt: finalPrompt,
				image_url: imageUrl,
				generate_audio: generateAudio,
				aspect_ratio: aspectRatio as any, // API types are strict but accept these values
				resolution: resolution as any, // API types are strict but accept these values
			},
			logs: true,
			onQueueUpdate: (update: any) => {
				if (update.status === 'IN_PROGRESS') {
					console.log('veo3.1 video generation in progress...', update)
					if (update.logs) {
						update.logs.map((log: any) => log.message).forEach(console.log)
					}
				}
			},
		})

		// Extract the video URL from the result
		const videoUrl = result.data.video.url

		return NextResponse.json({
			success: true,
			videoUrl: videoUrl,
			requestId: result.requestId,
		})
	} catch (error: any) {
		console.error('Error generating animation with veo3.1:', error)
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
