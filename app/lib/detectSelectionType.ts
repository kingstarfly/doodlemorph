import { Editor, TLShape } from 'tldraw'

export type SelectionType = {
	type: 'drawings' | 'image' | 'none'
	count: number
	shapes: TLShape[]
}

export function detectSelectionType(editor: Editor): SelectionType {
	const shapes = editor.getSelectedShapes()

	console.log(
		'Selected shapes:',
		shapes.length,
		shapes.map((s) => ({ id: s.id, type: s.type }))
	)

	if (shapes.length === 0) {
		return { type: 'none', count: 0, shapes: [] }
	}

	const drawings = shapes.filter((shape) => ['draw', 'geo', 'arrow'].includes(shape.type))
	const images = shapes.filter((shape) => shape.type === 'image')

	console.log('Drawings:', drawings.length, 'Images:', images.length)

	// If user has selected drawing shapes, return drawings type
	if (drawings.length > 0 && images.length === 0) {
		return { type: 'drawings', count: drawings.length, shapes: drawings }
	}

	// If user has selected exactly 1 image, return image type
	if (images.length === 1 && drawings.length === 0) {
		return { type: 'image', count: 1, shapes: images }
	}

	// Multiple images, mixed selection, or unsupported types - no AI toolbar
	return { type: 'none', count: 0, shapes: [] }
}
