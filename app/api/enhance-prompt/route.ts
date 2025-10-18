import { groq } from '@ai-sdk/groq'
import { generateText } from 'ai'
import { NextRequest, NextResponse } from 'next/server'

const GROQ_API_KEY = process.env.GROQ_API_KEY

export async function POST(req: NextRequest) {
	try {
		// Check for Groq API key in environment variables
		if (!GROQ_API_KEY) {
			return NextResponse.json(
				{ success: false, error: 'GROQ API key is not configured on the server' },
				{ status: 500 }
			)
		}

		const { userPrompt } = await req.json()

		if (!userPrompt || typeof userPrompt !== 'string') {
			return NextResponse.json(
				{ success: false, error: 'User prompt is required' },
				{ status: 400 }
			)
		}

		const { text } = await generateText({
			model: groq('openai/gpt-oss-20b'),
			prompt: `You are an expert at crafting concise image generation prompts. Transform the user's prompt into a short, focused phrase.

User's original prompt: "${userPrompt}"

Create an enhanced prompt using:
- Short, punchy phrases
- Consistent theme and style
- Maximum 30 words
- Focus on 1-2 key visual elements
- Use comma-separated descriptors

Return only the enhanced prompt, nothing else.`,
			temperature: 0.7,
		})

		return NextResponse.json({
			success: true,
			enhancedPrompt: text.trim(),
			originalPrompt: userPrompt,
		})
	} catch (error: any) {
		console.error('Error enhancing prompt:', error)
		return NextResponse.json(
			{
				success: false,
				error: error.message || 'Failed to enhance prompt',
			},
			{ status: 500 }
		)
	}
}
