import { Editor, TLShape, createShapeId, AssetRecordType } from 'tldraw'

/**
 * Places a video on the canvas below the original image
 */
export async function placeVideoOnCanvas(
	editor: Editor,
	videoUrl: string,
	originalShape: TLShape,
	prompt?: string
): Promise<string> {
	// Get the bounds of the original shape
	const originalPageBounds = editor.getShapePageBounds(originalShape)

	if (!originalPageBounds) {
		throw new Error('Could not get bounds of original shape.')
	}

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
			w: width,
			h: height,
		},
		meta: {
			generatedPrompt: prompt || '',
		},
	})

	return newShapeId
}
