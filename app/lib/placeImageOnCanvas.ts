import { Editor, TLShape, createShapeId } from 'tldraw'

export async function placeImageOnCanvas(
	editor: Editor,
	imageUrl: string,
	nearShapes: TLShape[]
): Promise<string> {
	// Get the position to place the new image
	// Place it to the right of the selected shapes
	const bounds = editor.getSelectionPageBounds()
	if (!bounds) {
		throw new Error('Could not get bounds of selection.')
	}

	const newShapeId = createShapeId()

	// Create the image shape to the right of the selection
	editor.createShape({
		id: newShapeId,
		type: 'image',
		x: bounds.maxX + 60, // Offset to the right
		y: bounds.midY - 200, // Center vertically (assuming ~400px height)
		props: {
			url: imageUrl,
			w: 400,
			h: 400,
		},
	})

	return newShapeId
}
