import { TLImageShape, Editor } from 'tldraw'

/**
 * Extracts image data from a TLImageShape and converts it to base64
 * Handles both data URLs and external URLs
 */
export async function extractImageFromShape(editor: Editor, shape: TLImageShape): Promise<string> {
	// In tldraw v3, images reference assets by assetId
	const assetId = shape.props.assetId

	if (!assetId) {
		throw new Error('Image shape has no assetId')
	}

	// Get the asset from the editor
	const asset = editor.getAsset(assetId)

	if (!asset || asset.type !== 'image') {
		throw new Error('Could not find image asset')
	}

	const src = asset.props.src

	if (!src) {
		throw new Error('Image asset has no src')
	}

	// If it's already a data URL, extract the base64 part
	if (src.startsWith('data:')) {
		// Format: data:image/png;base64,iVBORw0KGgo...
		const base64Match = src.match(/^data:image\/[^;]+;base64,(.+)$/)
		if (base64Match) {
			return base64Match[1]
		}
		// If no match, return the whole thing (API might handle it)
		return src
	}

	// If it's an external URL, fetch it and convert to base64
	try {
		const response = await fetch(src)
		if (!response.ok) {
			throw new Error(`Failed to fetch image: ${response.statusText}`)
		}
		const blob = await response.blob()

		// Convert blob to base64
		const base64 = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader()
			reader.onloadend = () => {
				const result = reader.result as string
				// Extract just the base64 part
				const base64Match = result.match(/^data:image\/[^;]+;base64,(.+)$/)
				if (base64Match) {
					resolve(base64Match[1])
				} else {
					resolve(result)
				}
			}
			reader.onerror = reject
			reader.readAsDataURL(blob)
		})

		return base64
	} catch (error) {
		console.error('Error extracting image from shape:', error)
		throw new Error('Failed to extract image data from shape')
	}
}
