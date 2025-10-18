import { Editor, TLShape } from 'tldraw'
import { blobToBase64 } from './blobToBase64'

export async function captureShapesAsImage(editor: Editor, shapes: TLShape[]): Promise<string> {
	// Get the bounding box of the selected shapes
	const maxSize = 1000
	const bounds = editor.getSelectionPageBounds()
	if (!bounds) {
		throw new Error('Could not get bounds of selection.')
	}

	// Calculate scale to fit within max size
	const scale = Math.min(1, maxSize / bounds.width, maxSize / bounds.height)

	// Export shapes to image
	const { blob } = await editor.toImage(shapes, {
		scale: scale,
		background: true,
		format: 'png',
	})

	if (!blob) {
		throw new Error('Could not capture image from shapes.')
	}

	// Convert blob to base64
	const dataUrl = await blobToBase64(blob)
	return dataUrl
}
