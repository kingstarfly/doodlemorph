import * as fal from '@fal-ai/serverless-client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
	try {
		const { imageBase64, prompt, apiKey } = await request.json()

		// Validate inputs
		if (!imageBase64 || !prompt) {
			return NextResponse.json(
				{ success: false, error: 'Missing imageBase64 or prompt' },
				{ status: 400 }
			)
		}

		if (!apiKey) {
			return NextResponse.json({ success: false, error: 'API key is required' }, { status: 400 })
		}

		// Configure fal.ai client
		fal.config({ credentials: apiKey })

		// Combine user prompt with base prompt for better results
		const finalPrompt = `high-quality character art, clean lines, ${prompt}`

		// Call fal.ai flux model with image input for better results
		// Using flux-dev which supports image-to-image
		const result = await fal.subscribe('fal-ai/flux/dev', {
			input: {
				prompt: finalPrompt,
				image_url: imageBase64,
				num_inference_steps: 28,
				guidance_scale: 3.5,
				num_images: 1,
				enable_safety_checker: false,
			},
			logs: true,
			onQueueUpdate: (update) => {
				if (update.status === 'IN_PROGRESS') {
					console.log('Generation in progress...')
				}
			},
		})

		// Extract the image URL from the result
		const imageUrl = result.data.images[0].url

		return NextResponse.json({
			success: true,
			imageUrl: imageUrl,
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
