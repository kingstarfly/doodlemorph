import { useCallback, useState } from 'react'
import { TLShape, TLImageShape, useEditor, useToasts } from 'tldraw'
import { extractImageFromShape } from '../../lib/extractImageFromShape'
import { placeVariantsOnCanvas } from '../../lib/placeVariantsOnCanvas'
import { LoadingIndicator } from '../LoadingIndicator'

export type ImageVariantsToolProps = {
	selectedShapes: TLShape[]
}

type Variant = {
	id: string
	prompt: string
}

const MAX_VARIANTS = 6

export function ImageVariantsTool(props: ImageVariantsToolProps) {
	const editor = useEditor()
	const { addToast } = useToasts()
	const [variants, setVariants] = useState<Variant[]>([{ id: '1', prompt: '' }])
	const [isGenerating, setIsGenerating] = useState(false)
	const [progress, setProgress] = useState('')

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
				// Don't allow removing the last variant
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

			// Validate at least one variant has a prompt
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

			// 1. Extract image from the selected shape
			const imageShape = props.selectedShapes[0] as TLImageShape
			const imageBase64 = await extractImageFromShape(editor, imageShape)

			setProgress(`Generating ${validVariants.length} variant(s)...`)

			// 2. Call API to generate variants
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

			// 3. Place variants on canvas
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

	return (
		<div className="image-variants-tool">
			<div className="variants-header">
				<span className="variants-title">Generate Character Variants</span>
			</div>

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
				<button onClick={handleGenerate} disabled={isGenerating} className="generate-button">
					✨ Generate Variant{variants.length > 1 ? 's' : ''}
				</button>
			</div>

			{isGenerating && <LoadingIndicator message={progress} />}
		</div>
	)
}
