import { Editor, TLShape, TLShapeId, createShapeId, AssetRecordType } from 'tldraw'

// Store video and text shape IDs to clean them up later
const videoShapeIds = new Map<TLShapeId, TLShapeId>() // Maps gray box ID to video ID
const textImageShapeIds = new Map<TLShapeId, TLShapeId>() // Maps gray box ID to text image ID

/**
 * Creates a text image using Canvas API
 */
function createTextImage(text: string, fontSize: number, color: string): string {
	const canvas = document.createElement('canvas')
	const ctx = canvas.getContext('2d')!

	// Set font to measure text
	ctx.font = `bold ${fontSize}px sans-serif`
	const textMetrics = ctx.measureText(text)
	const textWidth = textMetrics.width
	const textHeight = fontSize * 1.5 // Add some padding

	// Set canvas size with padding
	canvas.width = textWidth + 40
	canvas.height = textHeight + 20

	// Fill transparent background
	ctx.clearRect(0, 0, canvas.width, canvas.height)

	// Draw text
	ctx.font = `bold ${fontSize}px sans-serif`
	ctx.fillStyle = color
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	ctx.fillText(text, canvas.width / 2, canvas.height / 2)

	// Convert to data URL
	return canvas.toDataURL('image/png')
}

/**
 * Creates a gray placeholder box with a loading animation video in the center
 * Randomly selects one of two loading animation videos
 * Returns the gray box shape ID (the video is tracked internally)
 */
export async function createPlaceholderShape(
	editor: Editor,
	x: number,
	y: number,
	width: number,
	height: number
): Promise<TLShapeId> {
	const grayBoxShapeId = createShapeId()
	const videoShapeId = createShapeId()
	const textImageShapeId = createShapeId()
	const videoAssetId = AssetRecordType.createId()
	const textAssetId = AssetRecordType.createId()

	// Create the gray rectangle placeholder with softer styling (selectable)
	editor.createShape({
		id: grayBoxShapeId,
		type: 'geo',
		x,
		y,
		props: {
			geo: 'rectangle',
			w: width,
			h: height,
			color: 'grey',
			fill: 'semi',
			dash: 'dashed',
			size: 'm',
		},
		opacity: 0.6,
		isLocked: false,
	})

	try {
		// Randomly select one of the two loading animation videos
		const videoFiles = ['/loading_animation_1.mp4', '/loading_animation_2.mp4']
		const selectedVideo = videoFiles[Math.floor(Math.random() * videoFiles.length)]

		// Load the video
		const response = await fetch(selectedVideo)
		if (!response.ok) {
			throw new Error('Failed to load loading animation video')
		}
		const blob = await response.blob()

		// Convert to data URL
		const dataUrl = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader()
			reader.onloadend = () => resolve(reader.result as string)
			reader.onerror = reject
			reader.readAsDataURL(blob)
		})

		// Get video dimensions
		let videoWidth = 512
		let videoHeight = 512
		const video = document.createElement('video')
		await new Promise<void>((resolve, reject) => {
			video.onloadedmetadata = () => {
				videoWidth = video.videoWidth
				videoHeight = video.videoHeight
				resolve()
			}
			video.onerror = reject
			video.src = dataUrl
		})

		// Create the video asset
		editor.createAssets([
			{
				id: videoAssetId,
				type: 'video',
				typeName: 'asset',
				props: {
					name: 'loading-animation',
					src: dataUrl,
					w: videoWidth,
					h: videoHeight,
					mimeType: 'video/mp4',
					isAnimated: false,
				},
				meta: {},
			},
		])

		// Calculate video size - use smaller dimension and make it larger (50% of box size)
		const videoSize = Math.min(width, height) * 0.5
		// Position relative to parent (gray box), centered but shifted up to make room for text
		const relativeX = width / 2 - videoSize / 2
		const relativeY = height / 2 - videoSize / 2 - 35

		// Create the video shape centered in the gray box (locked and parented to gray box)
		editor.createShape({
			id: videoShapeId,
			type: 'video',
			x: relativeX,
			y: relativeY,
			props: {
				assetId: videoAssetId,
				w: videoSize,
				h: videoSize,
			},
			opacity: 1,
			isLocked: true,
			parentId: grayBoxShapeId,
		})

		// Track the video shape ID
		videoShapeIds.set(grayBoxShapeId, videoShapeId)

		// Create text as an image using Canvas API
		const textDataUrl = createTextImage('Morphing...', 32, 'grey') // violet color

		// Get text image dimensions from the canvas
		const textImg = new Image()
		let textImgWidth = 200
		let textImgHeight = 60
		await new Promise<void>((resolve) => {
			textImg.onload = () => {
				textImgWidth = textImg.width
				textImgHeight = textImg.height
				resolve()
			}
			textImg.src = textDataUrl
		})

		// Create the text image asset
		editor.createAssets([
			{
				id: textAssetId,
				type: 'image',
				typeName: 'asset',
				props: {
					name: 'morphing-text',
					src: textDataUrl,
					w: textImgWidth,
					h: textImgHeight,
					mimeType: 'image/png',
					isAnimated: false,
				},
				meta: {},
			},
		])

		// Position text below the video
		const textY = relativeY + videoSize + 15
		const textDisplayWidth = textImgWidth * 0.8
		const textDisplayHeight = textImgHeight * 0.8
		const textX = width / 2 - textDisplayWidth / 2

		// Create the text image shape
		editor.createShape({
			id: textImageShapeId,
			type: 'image',
			x: textX,
			y: textY,
			props: {
				assetId: textAssetId,
				w: textDisplayWidth,
				h: textDisplayHeight,
			},
			opacity: 0.9,
			isLocked: true,
			parentId: grayBoxShapeId,
		})

		// Track the text image shape ID
		textImageShapeIds.set(grayBoxShapeId, textImageShapeId)
	} catch (error) {
		console.error('Error creating loading animation video:', error)
		// If video fails, just keep the gray box
	}

	return grayBoxShapeId
}

/**
 * Safely deletes a placeholder shape (gray box) and its loading animation video and text
 */
export function deletePlaceholderShape(editor: Editor, shapeId: TLShapeId): void {
	console.log('Deleting placeholder shape:', shapeId)

	try {
		// Delete the video shape first (explicitly, even though it's a child)
		const videoShapeId = videoShapeIds.get(shapeId)
		if (videoShapeId) {
			console.log('Deleting video shape:', videoShapeId)
			try {
				const videoShape = editor.getShape(videoShapeId)
				if (videoShape) {
					editor.deleteShape(videoShapeId)
				}
			} catch (e) {
				// Video might already be deleted with parent, ignore
				console.log('Video already deleted or error:', e)
			}
			videoShapeIds.delete(shapeId)
		}

		// Delete the text image shape
		const textImageShapeId = textImageShapeIds.get(shapeId)
		if (textImageShapeId) {
			console.log('Deleting text image shape:', textImageShapeId)
			try {
				const textShape = editor.getShape(textImageShapeId)
				if (textShape) {
					editor.deleteShape(textImageShapeId)
				}
			} catch (e) {
				// Text might already be deleted with parent, ignore
				console.log('Text already deleted or error:', e)
			}
			textImageShapeIds.delete(shapeId)
		}

		// Delete the gray box shape (this will also delete children if any remain)
		const shape = editor.getShape(shapeId)
		if (shape) {
			console.log('Deleting gray box shape:', shapeId)
			editor.deleteShape(shapeId)
		} else {
			console.log('Gray box shape not found:', shapeId)
		}

		console.log('Placeholder deletion complete')
	} catch (error) {
		console.error('Failed to delete placeholder shape:', error)
	}
}
