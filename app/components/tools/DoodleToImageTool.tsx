import { useCallback, useState } from 'react'
import { TLShape, useEditor, useToasts } from 'tldraw'
import { captureShapesAsImage } from '../../lib/captureShapesAsImage'
import { placeImageOnCanvas } from '../../lib/placeImageOnCanvas'
import { LoadingIndicator } from '../LoadingIndicator'

export type DoodleToImageToolProps = {
	selectedShapes: TLShape[]
}

const STYLE_PRESETS = [
	{ emoji: '🎨', label: 'Cartoon', prompt: 'cartoon character, vibrant colors' },
	{ emoji: '🎮', label: 'Pixel Art', prompt: 'pixel art sprite, retro game style' },
	{ emoji: '🌟', label: '3D Render', prompt: '3D rendered character, Pixar style' },
	{ emoji: '🖼️', label: 'Sticker', prompt: 'die-cut sticker, white border' },
]

export function DoodleToImageTool(props: DoodleToImageToolProps) {
	const editor = useEditor()
	const { addToast } = useToasts()
	const [stylePrompt, setStylePrompt] = useState('')
	const [isGenerating, setIsGenerating] = useState(false)
	const [progress, setProgress] = useState('')

	const handleGenerate = useCallback(async () => {
		try {
			// Get API key
			const input = document.getElementById('fal_key_input') as HTMLInputElement
			const apiKey = input?.value ?? null
			if (!apiKey) {
				addToast({
					icon: 'warning-triangle',
					title: 'API Key Required',
					description: 'Please enter your fal.ai API key',
				})
				return
			}

			setIsGenerating(true)
			setProgress('Capturing drawing...')

			// 1. Capture drawing as image
			const imageBase64 = await captureShapesAsImage(editor, props.selectedShapes)

			setProgress('Generating styled image...')

			// 2. Call API
			const response = await fetch('/api/generate-image', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					imageBase64,
					prompt: stylePrompt || 'high quality character art',
					apiKey,
				}),
			})

			const result = await response.json()

			if (!result.success || result.error) {
				addToast({
					icon: 'warning-triangle',
					title: 'Generation failed',
					description: result.error || 'Unknown error',
				})
				setIsGenerating(false)
				return
			}

			setProgress('Placing on canvas...')

			// 3. Place on canvas
			await placeImageOnCanvas(editor, result.imageUrl, props.selectedShapes)

			setIsGenerating(false)
			setProgress('')
			addToast({
				icon: 'check',
				title: 'Image generated!',
			})
		} catch (error: any) {
			console.error('Error generating image:', error)
			addToast({
				icon: 'warning-triangle',
				title: 'Something went wrong',
				description: error.message.slice(0, 100),
			})
			setIsGenerating(false)
			setProgress('')
		}
	}, [editor, props.selectedShapes, stylePrompt, addToast])

	return (
		<div className="doodle-to-image-tool">
			<div className="prompt-input-row">
				<input
					type="text"
					value={stylePrompt}
					onChange={(e) => setStylePrompt(e.target.value)}
					maxLength={50}
					placeholder="e.g., cartoon style, pixel art, 3D render..."
					disabled={isGenerating}
					className="style-prompt-input"
				/>
				<button onClick={handleGenerate} disabled={isGenerating} className="generate-button">
					✨ Generate Image
				</button>
			</div>

			<div className="preset-buttons">
				{STYLE_PRESETS.map((preset) => (
					<button
						key={preset.label}
						onClick={() => setStylePrompt(preset.prompt)}
						disabled={isGenerating}
						className="preset-button"
					>
						{preset.emoji} {preset.label}
					</button>
				))}
			</div>

			{isGenerating && <LoadingIndicator message={progress} />}
		</div>
	)
}
