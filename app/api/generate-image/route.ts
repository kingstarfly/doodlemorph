import { fal } from '@fal-ai/client'
import { NextRequest, NextResponse } from 'next/server'

const FAL_KEY = process.env.FAL_KEY

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

		let finalApiKey = apiKey ?? FAL_KEY
		if (!finalApiKey) {
			return NextResponse.json({ success: false, error: 'API key is required' }, { status: 400 })
		}
		// Configure fal.ai client
		fal.config({ credentials: finalApiKey })

		// Convert base64 to data URI for fal.ai
		// The client will auto-upload the file for us
		const dataUri = imageBase64.startsWith('data:')
			? imageBase64
			: `data:image/png;base64,${imageBase64}`

		// Combine user prompt with base prompt for better results
		const finalPrompt = `Transform this sketch into: high-quality character art, clean lines, ${prompt}`

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
