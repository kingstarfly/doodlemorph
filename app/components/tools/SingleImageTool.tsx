import { useCallback, useState } from 'react'
import { TLShape, TLImageShape, useEditor, useToasts } from 'tldraw'
import { extractImageFromShape } from '../../lib/extractImageFromShape'
import { placeVariantsOnCanvas } from '../../lib/placeVariantsOnCanvas'
import { placeVideoOnCanvas } from '../../lib/placeVideoOnCanvas'
import { LoadingIndicator } from '../LoadingIndicator'

export type SingleImageToolProps = {
	selectedShapes: TLShape[]
}

type Variant = {
	id: string
	prompt: string
}

type ActionMode = 'none' | 'variants' | 'animation'

const MAX_VARIANTS = 6

export function SingleImageTool(props: SingleImageToolProps) {
	const editor = useEditor()
	const { addToast } = useToasts()
	const [activeMode, setActiveMode] = useState<ActionMode>('none')
	const [variants, setVariants] = useState<Variant[]>([{ id: '1', prompt: '' }])
	const [isGenerating, setIsGenerating] = useState(false)
	const [progress, setProgress] = useState('')
	const [isAnimationGenerating, setIsAnimationGenerating] = useState(false)
	const [animationPrompt, setAnimationPrompt] = useState(
		'smooth animation sequence, character movement, consistent style, natural motion'
	)
	const [generateAudio, setGenerateAudio] = useState(false)

	const addVariant = useCallback(() => {
		if (variants.length >= MAX_VARIANTS) {
			addToast({
				icon: 'warning-triangle',
				title: 'Maximum variants reached',
				description: `You can generate up to ${MAX_VARIANTS} variants at once`,
			})
			return
		}
		const newId = String(Date.now())
		setVariants([...variants, { id: newId, prompt: '' }])
	}, [variants, addToast])

	const removeVariant = useCallback(
		(id: string) => {
			if (variants.length === 1) {
				return
			}
			setVariants(variants.filter((v) => v.id !== id))
		},
		[variants]
	)

	const updateVariantPrompt = useCallback(
		(id: string, prompt: string) => {
			setVariants(variants.map((v) => (v.id === id ? { ...v, prompt } : v)))
		},
		[variants]
	)

	const handleGenerateVariants = useCallback(async () => {
		try {
			const validVariants = variants.filter((v) => v.prompt.trim() !== '')
			if (validVariants.length === 0) {
				addToast({
					icon: 'warning-triangle',
					title: 'No prompts provided',
					description: 'Please enter at least one variant prompt',
				})
				return
			}

			setIsGenerating(true)
			setProgress('Extracting image data...')

			const imageShape = props.selectedShapes[0] as TLImageShape
			const imageBase64 = await extractImageFromShape(editor, imageShape)

			setProgress(`Generating ${validVariants.length} variant(s)...`)

			const response = await fetch('/api/generate-variants', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					imageBase64,
					variants: validVariants.map((v) => ({ prompt: v.prompt })),
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

			setProgress('Placing variants on canvas...')

			const variantUrls = result.variants.map((v: any) => v.imageUrl)
			const variantPrompts = validVariants.map((v) => v.prompt)
			await placeVariantsOnCanvas(editor, variantUrls, imageShape, variantPrompts)

			setIsGenerating(false)
			setProgress('')
			addToast({
				icon: 'check',
				title: 'Variants generated!',
				description: `Successfully created ${validVariants.length} variant(s)`,
			})
		} catch (error: any) {
			console.error('Error generating variants:', error)
			addToast({
				icon: 'warning-triangle',
				title: 'Something went wrong',
				description: error.message.slice(0, 100),
			})
			setIsGenerating(false)
			setProgress('')
		}
	}, [editor, props.selectedShapes, variants, addToast])

	const handleGenerateAnimation = useCallback(async () => {
		try {
			setIsAnimationGenerating(true)

			// Show initial toast
			addToast({
				title: 'Preparing image...',
				description: 'Getting ready to generate animation',
			})

			const imageShape = props.selectedShapes[0] as TLImageShape
			const assetId = imageShape.props?.assetId

			if (!assetId) {
				addToast({
					icon: 'warning-triangle',
					title: 'No image found',
					description: 'Image shape has no assetId',
				})
				setIsAnimationGenerating(false)
				return
			}

			const asset = editor.getAsset(assetId)
			if (!asset || asset.type !== 'image') {
				addToast({
					icon: 'warning-triangle',
					title: 'No image found',
					description: 'Could not find image asset',
				})
				setIsAnimationGenerating(false)
				return
			}

			const imageUrl = asset.props.src
			if (!imageUrl) {
				addToast({
					icon: 'warning-triangle',
					title: 'No image found',
					description: 'Image has no source URL',
				})
				setIsAnimationGenerating(false)
				return
			}

			// Show generation toast
			addToast({
				title: 'Generating animation with Sora 2',
				description: 'This may take 1-2 minutes. Feel free to continue working!',
			})

			const response = await fetch('/api/generate-animation', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					imageUrl,
					prompt: animationPrompt,
					generateAudio,
				}),
			})

			const result = await response.json()

			if (!result.success || result.error) {
				addToast({
					icon: 'warning-triangle',
					title: 'Animation failed',
					description: result.error || 'Unknown error',
				})
				setIsAnimationGenerating(false)
				return
			}

			// Show placing toast
			addToast({
				title: 'Placing video on canvas...',
				description: 'Almost done!',
			})

			// Place the video on the canvas with prompt metadata (reusing imageShape from above)
			await placeVideoOnCanvas(editor, result.videoUrl, imageShape, animationPrompt)

			setIsAnimationGenerating(false)
			addToast({
				icon: 'check',
				title: 'Animation ready!',
				description: 'Video generated and placed on canvas',
			})
		} catch (error: any) {
			console.error('Error generating animation:', error)
			addToast({
				icon: 'warning-triangle',
				title: 'Something went wrong',
				description: error.message.slice(0, 100),
			})
			setIsAnimationGenerating(false)
		}
	}, [editor, props.selectedShapes, addToast, animationPrompt, generateAudio])

	const handleVariantsClick = () => {
		if (activeMode === 'variants') {
			setActiveMode('none')
		} else {
			setActiveMode('variants')
		}
	}

	const handleAnimationClick = () => {
		if (activeMode === 'animation') {
			setActiveMode('none')
		} else {
			setActiveMode('animation')
		}
	}

	return (
		<div className="single-image-tool">
			<div className="action-buttons-container">
				<button
					onClick={handleVariantsClick}
					disabled={isGenerating || isAnimationGenerating}
					className={`action-button ${activeMode === 'variants' ? 'active' : ''}`}
				>
					✨ Generate Variants
				</button>
				<button
					onClick={handleAnimationClick}
					disabled={isGenerating || isAnimationGenerating}
					className={`action-button ${activeMode === 'animation' ? 'active' : ''}`}
				>
					🎬 Generate Animation
				</button>
			</div>

			{activeMode === 'variants' && (
				<div className="variants-section">
					<div className="variants-list">
						{variants.map((variant, index) => (
							<div key={variant.id} className="variant-row">
								<span className="variant-number">{index + 1}.</span>
								<input
									type="text"
									value={variant.prompt}
									onChange={(e) => updateVariantPrompt(variant.id, e.target.value)}
									placeholder="e.g., wearing a hat, different pose, smiling..."
									disabled={isGenerating || isAnimationGenerating}
									className="variant-prompt-input"
									maxLength={100}
								/>
								{variants.length > 1 && (
									<button
										onClick={() => removeVariant(variant.id)}
										disabled={isGenerating || isAnimationGenerating}
										className="remove-variant-button"
										title="Remove variant"
									>
										✕
									</button>
								)}
							</div>
						))}
					</div>

					<div className="variants-actions">
						<button
							onClick={addVariant}
							disabled={isGenerating || isAnimationGenerating || variants.length >= MAX_VARIANTS}
							className="add-variant-button"
						>
							+ Add Variant
						</button>
						<button
							onClick={handleGenerateVariants}
							disabled={isGenerating || isAnimationGenerating}
							className="generate-button"
						>
							✨ Generate Variant{variants.length > 1 ? 's' : ''}
						</button>
					</div>
				</div>
			)}

			{activeMode === 'animation' && (
				<div className="animation-section">
					<div className="animation-info">
						<p className="info-text">Create a smooth animation with Sora 2</p>
					</div>
					<div className="animation-prompt-row">
						<input
							type="text"
							value={animationPrompt}
							onChange={(e) => setAnimationPrompt(e.target.value)}
							placeholder="Describe the animation style..."
							disabled={isGenerating || isAnimationGenerating}
							className="animation-prompt-input"
							maxLength={200}
						/>
					</div>
					<div className="animation-options">
						<label className="audio-checkbox-label">
							<input
								type="checkbox"
								checked={generateAudio}
								onChange={(e) => setGenerateAudio(e.target.checked)}
								disabled={isGenerating || isAnimationGenerating}
								className="audio-checkbox"
							/>
							<span>🔊 Generate sound effects</span>
						</label>
					</div>
					<button
						onClick={handleGenerateAnimation}
						disabled={isGenerating || isAnimationGenerating}
						className="create-animation-button"
					>
						🎬 Create Animation with Sora 2
					</button>
				</div>
			)}

			{isGenerating && <LoadingIndicator message={progress} />}
		</div>
	)
}
