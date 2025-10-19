import { fal } from '@fal-ai/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { trackGenerationEvent } from '@/app/lib/posthog-server'

const FAL_API_KEY = process.env.FAL_API_KEY

// Define request schema with Zod
const GenerateImageSchema = z.object({
	imageBase64: z.string().min(1, 'Image data is required'),
	prompt: z.string().min(1, 'Prompt is required').max(500),
})

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()

		// Validate and parse input with Zod
		const validation = GenerateImageSchema.safeParse(body)
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

		const { imageBase64, prompt } = validation.data

		// Check for FAL API key in environment variables
		if (!FAL_API_KEY) {
			return NextResponse.json(
				{ success: false, error: 'FAL API key is not configured on the server' },
				{ status: 500 }
			)
		}
		// Configure fal.ai client
		fal.config({ credentials: FAL_API_KEY })

		// Convert base64 to data URI for fal.ai
		// The client will auto-upload the file for us
		const dataUri = imageBase64.startsWith('data:')
			? imageBase64
			: `data:image/png;base64,${imageBase64}`

		// Combine user prompt with base prompt for better results
		const finalPrompt = `Transform this sketch into: high-quality character art, clean lines, plain colored background, ${prompt}`

		// Call fal.ai Gemini model for image editing
		const result = await fal.subscribe('fal-ai/gemini-25-flash-image/edit', {
			input: {
				prompt: finalPrompt,
				image_urls: [dataUri],
				num_images: 1,
				output_format: 'jpeg',
			},
			logs: true,
			onQueueUpdate: (update: any) => {
				if (update.status === 'IN_PROGRESS') {
					update.logs?.map((log: any) => log.message).forEach(console.log)
				}
			},
		})

		console.log('API Result:', JSON.stringify(result, null, 2))

		// Extract the image URL from the result
		const imageUrl = result.data?.images?.[0]?.url

		if (!imageUrl) {
			throw new Error('No image URL in response: ' + JSON.stringify(result))
		}

		// Track generation event
		trackGenerationEvent('image_generated', {
			prompt: finalPrompt,
			originalPrompt: prompt,
			sourceImageProvided: true,
			outputImageUrl: imageUrl,
			model: 'fal-ai/gemini-25-flash-image/edit',
		})

		return NextResponse.json({
			success: true,
			imageUrl: imageUrl,
			description: result.data?.description,
		})
	} catch (error: any) {
		console.error('Error generating image:', error)
		return NextResponse.json(
			{
				success: false,
				error: error.message || 'Failed to generate image',
			},
			{ status: 500 }
		)
	}
}
