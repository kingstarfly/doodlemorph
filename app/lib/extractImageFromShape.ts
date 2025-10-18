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

	// Helper function to convert blob to base64
	const blobToBase64 = async (blob: Blob): Promise<string> => {
		return new Promise<string>((resolve, reject) => {
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
	}

	// If it's an asset: URL, use tldraw's export functionality
	// This happens when images are copied/pasted from external sources
	if (src.startsWith('asset:')) {
		try {
			// Export the shape as a blob using tldraw's built-in toImage
			const { blob } = await editor.toImage([shape], {
				format: 'png',
				background: false,
			})

			if (!blob) {
				throw new Error('Failed to export shape to blob')
			}

			return await blobToBase64(blob)
		} catch (error) {
			console.error('Error exporting asset image:', error)
			throw new Error(`Failed to extract image data from asset: ${src.substring(0, 50)}...`)
		}
	}

	// If it's a blob URL or external URL, fetch it and convert to base64
	// Blob URLs are created when copying/pasting images (e.g., blob:http://localhost:3000/...)
	if (src.startsWith('blob:') || src.startsWith('http://') || src.startsWith('https://')) {
		try {
			const response = await fetch(src)
			if (!response.ok) {
				throw new Error(`Failed to fetch image: ${response.statusText}`)
			}
			const blob = await response.blob()
			return await blobToBase64(blob)
		} catch (error) {
			console.error('Error extracting image from shape:', error)
			throw new Error(`Failed to extract image data from shape. Source: ${src.substring(0, 50)}...`)
		}
	}

	// Fallback for other URL types
	throw new Error(`Unsupported image source format: ${src.substring(0, 50)}...`)
}
