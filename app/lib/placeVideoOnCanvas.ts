import { Editor, TLShape, TLShapeId, createShapeId, AssetRecordType } from 'tldraw'
import { deletePlaceholderShape } from './createPlaceholderShape'

/**
 * Calculate dimensions that fit within target size while maintaining aspect ratio
 */
function calculateAspectRatioFit(
	srcWidth: number,
	srcHeight: number,
	maxWidth: number,
	maxHeight: number
): { width: number; height: number } {
	const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight)
	return {
		width: srcWidth * ratio,
		height: srcHeight * ratio,
	}
}

/**
 * Places a video on the canvas below the original image
 */
export async function placeVideoOnCanvas(
	editor: Editor,
	videoUrl: string,
	originalShape: TLShape,
	prompt?: string,
	placeholderShapeId?: TLShapeId
): Promise<TLShapeId> {
	// Get the bounds of the original shape
	const originalPageBounds = editor.getShapePageBounds(originalShape)

	if (!originalPageBounds) {
		throw new Error('Could not get bounds of original shape.')
	}

	// Always create a new shape ID for the final video
	const newShapeId = createShapeId()
	const assetId = AssetRecordType.createId()

	// Fetch the video as a blob and convert to data URL
	let width = originalPageBounds.width
	let height = originalPageBounds.height
	let dataUrl: string

	try {
		// Fetch the video
		const response = await fetch(videoUrl)
		if (!response.ok) {
			throw new Error(`Failed to fetch video: ${response.statusText}`)
		}
		const blob = await response.blob()

		// Convert blob to data URL
		dataUrl = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader()
			reader.onloadend = () => resolve(reader.result as string)
			reader.onerror = reject
			reader.readAsDataURL(blob)
		})

		// Load the video to get dimensions
		const video = document.createElement('video')
		await new Promise<void>((resolve, reject) => {
			video.onloadedmetadata = () => {
				width = video.videoWidth
				height = video.videoHeight
				resolve()
			}
			video.onerror = reject
			video.src = dataUrl
		})
	} catch (error) {
		console.error('Error loading video:', error)
		throw new Error('Failed to load video from URL')
	}

	// Calculate dimensions that fit within reference shape size while maintaining aspect ratio
	const targetDimensions = calculateAspectRatioFit(
		width,
		height,
		originalPageBounds.width,
		originalPageBounds.height
	)

	// Create the video asset record with the data URL
	editor.createAssets([
		{
			id: assetId,
			type: 'video',
			typeName: 'asset',
			props: {
				name: 'generated-animation',
				src: dataUrl,
				w: width,
				h: height,
				mimeType: 'video/mp4',
				isAnimated: true,
			},
			meta: {},
		},
	])

	if (placeholderShapeId) {
		// Update the existing placeholder shape - we need to delete it and create new one
		// because we can't change the type from 'geo' to 'video'
		console.log('PlaceVideoOnCanvas: Replacing placeholder with ID:', placeholderShapeId)
		const placeholderShape = editor.getShape(placeholderShapeId)
		if (placeholderShape) {
			const placeholderBounds = editor.getShapePageBounds(placeholderShape)
			if (placeholderBounds) {
				// Delete the placeholder (and its spinning logo) properly
				console.log('PlaceVideoOnCanvas: About to delete placeholder')
				deletePlaceholderShape(editor, placeholderShapeId)

				// Create the video in its place
				editor.createShape({
					id: newShapeId,
					type: 'video',
					x: placeholderBounds.x,
					y: placeholderBounds.y,
					props: {
						assetId: assetId,
						w: targetDimensions.width,
						h: targetDimensions.height,
					},
					meta: {
						generatedPrompt: prompt || '',
					},
				})
			}
		} else {
			throw new Error('Placeholder shape not found')
		}
	} else {
		// Calculate position below the original image
		const verticalSpacing = 40
		const videoY = originalPageBounds.maxY + verticalSpacing

		// Create the video shape
		editor.createShape({
			id: newShapeId,
			type: 'video',
			x: originalPageBounds.minX, // Align with original image's left edge
			y: videoY,
			props: {
				assetId: assetId,
				w: targetDimensions.width,
				h: targetDimensions.height,
			},
			meta: {
				generatedPrompt: prompt || '',
			},
		})
	}

	return newShapeId
}
