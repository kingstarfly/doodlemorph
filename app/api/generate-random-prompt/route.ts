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

		const { text } = await generateText({
			model: groq('llama-3.3-70b-versatile'),
			prompt: `Generate a short, creative image variation prompt (max 10 words) for modifying a character or object. 
Examples: "wearing a wizard hat", "in cyberpunk style", "with rainbow colors", "doing a backflip", "as a superhero".
Just return the prompt text, nothing else.`,
			temperature: 1.5,
		})

		return NextResponse.json({
			success: true,
			prompt: text.trim(),
		})
	} catch (error: any) {
		console.error('Error generating random prompt:', error)
		return NextResponse.json(
			{
				success: false,
				error: error.message || 'Failed to generate prompt',
			},
			{ status: 500 }
		)
	}
}
