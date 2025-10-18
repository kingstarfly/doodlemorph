import { Editor, TLShape, createShapeId, AssetRecordType } from 'tldraw'

export async function placeImageOnCanvas(
	editor: Editor,
	imageUrl: string,
	referenceShape: TLShape,
	prompt?: string
): Promise<string> {
	// Get the position to place the new image
	// Place it to the right of the reference shape
	const bounds = editor.getShapePageBounds(referenceShape)
	if (!bounds) {
		throw new Error('Could not get bounds of reference shape. The shape may have been deleted.')
	}

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

	// Now create the image shape that references this asset
	editor.createShape({
		id: newShapeId,
		type: 'image',
		x: bounds.maxX + 60, // Offset to the right
		y: bounds.midY - height / 2, // Center vertically based on actual height
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
