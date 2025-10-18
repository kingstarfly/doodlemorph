import { useCallback, useState } from 'react'
import { TLShape, TLImageShape, useEditor, useToasts } from 'tldraw'
import { extractImageFromShape } from '../../lib/extractImageFromShape'
import { placeVariantsOnCanvas } from '../../lib/placeVariantsOnCanvas'
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
	const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)
	const [animationPrompt, setAnimationPrompt] = useState(
		'smooth animation sequence, character movement, consistent style, natural motion'
	)

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

			setProgress('Placing variants on canvas...')

			const variantUrls = result.variants.map((v: any) => v.imageUrl)
			await placeVariantsOnCanvas(editor, variantUrls, imageShape)

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
			const falInput = document.getElementById('fal_key_input') as HTMLInputElement
			const falApiKey = falInput?.value ?? null
			if (!falApiKey) {
				addToast({
					icon: 'warning-triangle',
					title: 'FAL API Key Required',
					description: 'Please enter your fal.ai API key',
				})
				return
			}

			const openaiInput = document.getElementById('openai_key_input') as HTMLInputElement
			const userOpenaiApiKey = openaiInput.value.length > 0 ? openaiInput.value : null

			setIsGenerating(true)
			setProgress('Preparing image...')

			const imageShape = props.selectedShapes[0] as TLImageShape
			const assetId = imageShape.props?.assetId

			if (!assetId) {
				addToast({
					icon: 'warning-triangle',
					title: 'No image found',
					description: 'Image shape has no assetId',
				})
				setIsGenerating(false)
				return
			}

			const asset = editor.getAsset(assetId)
			if (!asset || asset.type !== 'image') {
				addToast({
					icon: 'warning-triangle',
					title: 'No image found',
					description: 'Could not find image asset',
				})
				setIsGenerating(false)
				return
			}

			const imageUrl = asset.props.src
			if (!imageUrl) {
				addToast({
					icon: 'warning-triangle',
					title: 'No image found',
					description: 'Image has no source URL',
				})
				setIsGenerating(false)
				return
			}

			setProgress('Generating animation with Sora 2 (this may take 1-2 minutes)...')

			const response = await fetch('/api/generate-animation', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					imageUrl,
					prompt: animationPrompt,
					duration: '4',
					aspectRatio: 'auto',
					resolution: 'auto',
					falApiKey,
					openaiApiKey: userOpenaiApiKey,
				}),
			})

			const result = await response.json()

			if (!result.success || result.error) {
				addToast({
					icon: 'warning-triangle',
					title: 'Animation failed',
					description: result.error || 'Unknown error',
				})
				setIsGenerating(false)
				return
			}

			setProgress('Done!')
			setGeneratedVideoUrl(result.videoUrl)

			setIsGenerating(false)
			addToast({
				icon: 'check',
				title: 'Animation ready!',
				description: 'Video generated with Sora 2',
			})
		} catch (error: any) {
			console.error('Error generating animation:', error)
			addToast({
				icon: 'warning-triangle',
				title: 'Something went wrong',
				description: error.message.slice(0, 100),
			})
			setIsGenerating(false)
			setProgress('')
		}
	}, [editor, props.selectedShapes, addToast, animationPrompt])

	const handleVariantsClick = () => {
		if (activeMode === 'variants') {
			setActiveMode('none')
		} else {
			setActiveMode('variants')
			setGeneratedVideoUrl(null)
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
					disabled={isGenerating}
					className={`action-button ${activeMode === 'variants' ? 'active' : ''}`}
				>
					✨ Generate Variants
				</button>
				<button
					onClick={handleAnimationClick}
					disabled={isGenerating}
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
									disabled={isGenerating}
									className="variant-prompt-input"
									maxLength={100}
								/>
								{variants.length > 1 && (
									<button
										onClick={() => removeVariant(variant.id)}
										disabled={isGenerating}
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
							disabled={isGenerating || variants.length >= MAX_VARIANTS}
							className="add-variant-button"
						>
							+ Add Variant
						</button>
						<button
							onClick={handleGenerateVariants}
							disabled={isGenerating}
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
							disabled={isGenerating}
							className="animation-prompt-input"
							maxLength={200}
						/>
					</div>
					<button
						onClick={handleGenerateAnimation}
						disabled={isGenerating}
						className="create-animation-button"
					>
						🎬 Create Animation with Sora 2
					</button>
				</div>
			)}

			{isGenerating && <LoadingIndicator message={progress} />}

			{generatedVideoUrl && !isGenerating && activeMode === 'animation' && (
				<div className="video-result">
					<video src={generatedVideoUrl} controls width={300} />
					<a href={generatedVideoUrl} download="animation.mp4" className="download-button">
						📥 Download Animation
					</a>
				</div>
			)}
		</div>
	)
}
