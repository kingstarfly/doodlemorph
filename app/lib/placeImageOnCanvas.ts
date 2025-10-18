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

export async function placeImageOnCanvas(
	editor: Editor,
	imageUrl: string,
	referenceShape: TLShape,
	prompt?: string,
	placeholderShapeId?: TLShapeId,
	overrideBounds?: {
		minX: number
		maxX: number
		minY: number
		maxY: number
		width: number
		height: number
		midX: number
		midY: number
	}
): Promise<TLShapeId> {
	// Get the position to place the new image
	// Place it to the right of the reference shape
	// Use overrideBounds if provided (for multi-shape selections), otherwise get from referenceShape
	const bounds = overrideBounds || editor.getShapePageBounds(referenceShape)
	if (!bounds) {
		throw new Error('Could not get bounds of reference shape. The shape may have been deleted.')
	}

	// Always create a new shape ID for the final image
	const newShapeId = createShapeId()

	// First, we need to create an asset for the image
	const assetId = AssetRecordType.createId()

	// Fetch the image as a blob and convert to data URL
	// This is necessary for tldraw v3 to properly display external images
	let width = 400
	let height = 400
	let dataUrl: string

	try {
		// Fetch the image
		const response = await fetch(imageUrl)
		if (!response.ok) {
			throw new Error(`Failed to fetch image: ${response.statusText}`)
		}
		const blob = await response.blob()

		// Convert blob to data URL
		dataUrl = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader()
			reader.onloadend = () => resolve(reader.result as string)
			reader.onerror = reject
			reader.readAsDataURL(blob)
		})

		// Load the image to get dimensions
		const img = new Image()
		await new Promise<void>((resolve, reject) => {
			img.onload = () => {
				width = img.width
				height = img.height
				resolve()
			}
			img.onerror = reject
			img.src = dataUrl
		})
	} catch (error) {
		console.error('Error loading image:', error)
		throw new Error('Failed to load image from URL')
	}

	// Calculate dimensions that fit within reference shape size while maintaining aspect ratio
	const targetDimensions = calculateAspectRatioFit(width, height, bounds.width, bounds.height)

	// Create the asset record with the data URL
	editor.createAssets([
		{
			id: assetId,
			type: 'image',
			typeName: 'asset',
			props: {
				name: 'generated-image',
				src: dataUrl, // Use data URL instead of external URL
				w: width,
				h: height,
				mimeType: 'image/jpeg',
				isAnimated: false,
			},
			meta: {},
		},
	])

	if (placeholderShapeId) {
		// Update the existing placeholder shape - we need to delete it and create new one
		// because we can't change the type from 'geo' to 'image'
		console.log('PlaceImageOnCanvas: Replacing placeholder with ID:', placeholderShapeId)
		const placeholderShape = editor.getShape(placeholderShapeId)
		if (placeholderShape) {
			const placeholderBounds = editor.getShapePageBounds(placeholderShape)
			if (placeholderBounds) {
				// Delete the placeholder (and its spinning logo) properly
				console.log('PlaceImageOnCanvas: About to delete placeholder')
				deletePlaceholderShape(editor, placeholderShapeId)

				// Create the image in its place
				editor.createShape({
					id: newShapeId,
					type: 'image',
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
		// Create a new image shape
		editor.createShape({
			id: newShapeId,
			type: 'image',
			x: bounds.maxX + 60, // Offset to the right
			y: bounds.midY - targetDimensions.height / 2, // Center vertically based on fitted height
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
