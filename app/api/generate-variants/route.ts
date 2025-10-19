import { fal } from '@fal-ai/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { trackGenerationEvent } from '@/app/lib/posthog-server'

const FAL_API_KEY = process.env.FAL_API_KEY

// Define schemas with Zod
const VariantSchema = z.object({
	prompt: z.string().min(1, 'Variant prompt is required').max(500),
})

const GenerateVariantsSchema = z.object({
	imageBase64: z.string().min(1, 'Image data is required'),
	variants: z.array(VariantSchema).min(1, 'At least one variant is required').max(6),
})

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()

		// Validate and parse input with Zod
		const validation = GenerateVariantsSchema.safeParse(body)
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

		const { imageBase64, variants } = validation.data

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
		const dataUri = imageBase64.startsWith('data:')
			? imageBase64
			: `data:image/png;base64,${imageBase64}`

		// Generate each variant
		const generatedVariants = []

		for (let i = 0; i < variants.length; i++) {
			const variant = variants[i]
			console.log(`Generating variant ${i + 1}/${variants.length}: ${variant.prompt}`)

			// Create final prompt for this variant
			const finalPrompt = `Transform this character: ${variant.prompt}, high-quality character art, clean lines`

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

			console.log(`Variant ${i + 1} result:`, JSON.stringify(result, null, 2))

			// Extract the image URL from the result
			const imageUrl = result.data?.images?.[0]?.url

			if (!imageUrl) {
				throw new Error(`No image URL in variant ${i + 1} response: ${JSON.stringify(result)}`)
			}

			generatedVariants.push({
				imageUrl,
				prompt: variant.prompt,
			})
		}

		// Track variants generation event
		trackGenerationEvent('variants_generated', {
			sourceImageProvided: true,
			variantCount: generatedVariants.length,
			variants: generatedVariants.map((v) => ({
				prompt: v.prompt,
				outputImageUrl: v.imageUrl,
			})),
			model: 'fal-ai/gemini-25-flash-image/edit',
		})

		return NextResponse.json({
			success: true,
			variants: generatedVariants,
		})
	} catch (error: any) {
		console.error('Error generating variants:', error)
		return NextResponse.json(
			{
				success: false,
				error: error.message || 'Failed to generate variants',
			},
			{ status: 500 }
		)
	}
}
