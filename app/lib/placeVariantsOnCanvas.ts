import { Editor, TLShape, createShapeId, AssetRecordType } from 'tldraw'

/**
 * Places multiple variant images vertically below the original image
 */
export async function placeVariantsOnCanvas(
	editor: Editor,
	variantUrls: string[],
	originalShape: TLShape,
	prompts?: string[]
): Promise<string[]> {
	if (variantUrls.length === 0) {
		return []
	}

	// Get the bounds of the original shape
	const bounds = editor.getShapeGeometry(originalShape).bounds
	const originalPageBounds = editor.getShapePageBounds(originalShape)

	if (!originalPageBounds) {
		throw new Error('Could not get bounds of original shape.')
	}

	const createdShapeIds: string[] = []
	const verticalSpacing = 40 // Space between images

	// Start positioning below the original image
	let currentY = originalPageBounds.maxY + verticalSpacing

	// Process each variant
	for (let i = 0; i < variantUrls.length; i++) {
		const imageUrl = variantUrls[i]
		const newShapeId = createShapeId()
		const assetId = AssetRecordType.createId()

		// Fetch the image as a blob and convert to data URL
		let width = originalPageBounds.width
		let height = originalPageBounds.height
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
			console.error(`Error loading variant ${i + 1}:`, error)
			continue // Skip this variant if it fails
		}

		// Create the asset record with the data URL
		editor.createAssets([
			{
				id: assetId,
				type: 'image',
				typeName: 'asset',
				props: {
					name: `variant-${i + 1}`,
					src: dataUrl,
					w: width,
					h: height,
					mimeType: 'image/jpeg',
					isAnimated: false,
				},
				meta: {},
			},
		])

		// Create the image shape
		editor.createShape({
			id: newShapeId,
			type: 'image',
			x: originalPageBounds.minX, // Align with original image's left edge
			y: currentY,
			props: {
				assetId: assetId,
				w: width,
				h: height,
			},
			meta: {
				generatedPrompt: prompts && prompts[i] ? prompts[i] : '',
			},
		})

		createdShapeIds.push(newShapeId)

		// Update Y position for next variant
		currentY += height + verticalSpacing
	}

	return createdShapeIds
}
