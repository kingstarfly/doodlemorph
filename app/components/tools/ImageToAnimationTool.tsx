import { useCallback, useState } from 'react'
import { TLShape, TLImageShape, useToasts } from 'tldraw'
import { LoadingIndicator } from '../LoadingIndicator'

export type ImageToAnimationToolProps = {
	selectedShapes: TLShape[]
}

export function ImageToAnimationTool(props: ImageToAnimationToolProps) {
	const { addToast } = useToasts()
	const [isGenerating, setIsGenerating] = useState(false)
	const [progress, setProgress] = useState('')
	const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)

	const handleCreateAnimation = useCallback(async () => {
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
			setProgress('Preparing images...')

			// 1. Extract image URLs from shapes
			const imageUrls = props.selectedShapes
				.map((shape) => {
					const imageShape = shape as TLImageShape
					return imageShape.props?.src || null
				})
				.filter((url): url is string => url !== null)

			if (imageUrls.length < 2) {
				addToast({
					icon: 'warning-triangle',
					title: 'Not enough images',
					description: 'Need at least 2 images to create animation',
				})
				setIsGenerating(false)
				return
			}

			setProgress('Creating animation (this may take 30-60 seconds)...')

			// 2. Call API
			const response = await fetch('/api/generate-animation', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					imageUrls,
					fps: 8,
					apiKey,
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
	}, [props.selectedShapes, addToast])

	return (
		<div className="image-to-animation-tool">
			<div className="selection-order">
				<span className="order-label">Selection order:</span>
				{props.selectedShapes.map((shape, idx) => (
					<span key={shape.id} className="order-item">
						[{idx + 1}]{idx < props.selectedShapes.length - 1 && ' → '}
					</span>
				))}
			</div>

			<div className="animation-controls">
				<button
					onClick={handleCreateAnimation}
					disabled={isGenerating}
					className="create-animation-button"
				>
					🎬 Create Animation
				</button>
			</div>

			{isGenerating && <LoadingIndicator message={progress} />}

			{generatedVideoUrl && !isGenerating && (
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
