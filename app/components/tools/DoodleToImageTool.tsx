import { useCallback, useState } from 'react'
import { TLShape, TLShapeId, useEditor, useToasts } from 'tldraw'
import { captureShapesAsImage } from '../../lib/captureShapesAsImage'
import { placeImageOnCanvas } from '../../lib/placeImageOnCanvas'
import { createPlaceholderShape, deletePlaceholderShape } from '../../lib/createPlaceholderShape'
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
	const [isEnhancing, setIsEnhancing] = useState(false)

	const handleGenerate = useCallback(async () => {
		let placeholderShapeId: TLShapeId | null = null
		try {
			setIsGenerating(true)
			setProgress('Capturing drawing...')

			// Capture reference shape early before any async operations
			const referenceShape = props.selectedShapes[0]

			// Calculate the combined bounds of ALL selected shapes
			let minX = Infinity
			let maxX = -Infinity
			let minY = Infinity
			let maxY = -Infinity

			for (const shape of props.selectedShapes) {
				const shapeBounds = editor.getShapePageBounds(shape)
				if (shapeBounds) {
					minX = Math.min(minX, shapeBounds.minX)
					maxX = Math.max(maxX, shapeBounds.maxX)
					minY = Math.min(minY, shapeBounds.minY)
					maxY = Math.max(maxY, shapeBounds.maxY)
				}
			}

			if (minX === Infinity || maxX === -Infinity || minY === Infinity || maxY === -Infinity) {
				throw new Error('Could not get bounds of selected shapes')
			}

			const combinedWidth = maxX - minX
			const combinedHeight = maxY - minY
			const combinedMidY = minY + combinedHeight / 2

			// Create placeholder shape positioned to the right of the combined selection
			placeholderShapeId = await createPlaceholderShape(
				editor,
				maxX + 60,
				combinedMidY - combinedHeight / 2,
				combinedWidth,
				combinedHeight
			)

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
				}),
			})

			const result = await response.json()

			if (!result.success || result.error) {
				addToast({
					icon: 'warning-triangle',
					title: 'Generation failed',
					description: result.error || 'Unknown error',
				})
				// Clean up placeholder on failure
				if (placeholderShapeId) {
					deletePlaceholderShape(editor, placeholderShapeId)
				}
				setIsGenerating(false)
				return
			}

			setProgress('Placing on canvas...')

			// 3. Place on canvas with prompt metadata, updating the placeholder
			// Create a synthetic bounds object with the combined dimensions
			const combinedBounds = {
				minX,
				maxX,
				minY,
				maxY,
				width: combinedWidth,
				height: combinedHeight,
				midX: minX + combinedWidth / 2,
				midY: combinedMidY,
			}

			await placeImageOnCanvas(
				editor,
				result.imageUrl,
				referenceShape,
				stylePrompt || 'high quality character art',
				placeholderShapeId,
				combinedBounds
			)

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
			// Clean up placeholder on error
			if (placeholderShapeId) {
				deletePlaceholderShape(editor, placeholderShapeId)
			}
			setIsGenerating(false)
			setProgress('')
		}
	}, [editor, props.selectedShapes, stylePrompt, addToast])

	const enhancePrompt = useCallback(async () => {
		if (!stylePrompt.trim()) {
			addToast({
				icon: 'warning-triangle',
				title: 'No prompt to enhance',
				description: 'Please enter a prompt first',
			})
			return
		}

		try {
			setIsEnhancing(true)
			const response = await fetch('/api/enhance-prompt', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					userPrompt: stylePrompt,
				}),
			})

			const result = await response.json()

			if (result.success && result.enhancedPrompt) {
				setStylePrompt(result.enhancedPrompt)
				addToast({
					icon: 'check',
					title: 'Prompt enhanced!',
					description: 'Your prompt has been improved',
				})
			} else {
				addToast({
					icon: 'warning-triangle',
					title: 'Enhancement failed',
					description: result.error || 'Could not enhance prompt',
				})
			}
		} catch (error: any) {
			console.error('Error enhancing prompt:', error)
			addToast({
				icon: 'warning-triangle',
				title: 'Something went wrong',
				description: 'Failed to enhance prompt',
			})
		} finally {
			setIsEnhancing(false)
		}
	}, [stylePrompt, addToast])

	return (
		<div className="doodle-to-image-tool">
			<div className="prompt-input-row">
				<input
					type="text"
					value={stylePrompt}
					onChange={(e) => setStylePrompt(e.target.value)}
					maxLength={200}
					placeholder="e.g., cartoon style, pixel art, 3D render..."
					disabled={isGenerating || isEnhancing}
					className="style-prompt-input"
				/>
				<button
					onClick={enhancePrompt}
					disabled={isGenerating || isEnhancing}
					className="main-enhance-button"
					title="Enhance prompt with AI"
				>
					{isEnhancing ? '⏳' : '✧'}
				</button>
				<button
					onClick={handleGenerate}
					disabled={isGenerating || isEnhancing}
					className="generate-button"
				>
					✨ Morph
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
