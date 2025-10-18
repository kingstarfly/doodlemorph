import { useEditor } from 'tldraw'
import { useEffect, useState } from 'react'
import { detectSelectionType, SelectionType } from '../lib/detectSelectionType'
import { DoodleToImageTool } from './tools/DoodleToImageTool'
import { SingleImageTool } from './tools/SingleImageTool'
import { PromptDisplay } from './PromptDisplay'
import './tools/tools.css'

export function ToolbarContainer() {
	const editor = useEditor()
	const [selectionType, setSelectionType] = useState<SelectionType>({
		type: 'none',
		count: 0,
		shapes: [],
	})

	useEffect(() => {
		function handleChange() {
			const detected = detectSelectionType(editor)
			console.log('Selection detected:', detected.type, 'count:', detected.count)
			setSelectionType(detected)
		}

		// Check immediately
		handleChange()

		// Listen to changes - using a more frequent check
		const unsubscribe = editor.store.listen(handleChange)

		return () => {
			unsubscribe()
		}
	}, [editor])

	console.log('ToolbarContainer rendering, selectionType:', selectionType.type)

	// Check if the selected shape has a generation prompt (for any single shape)
	const selectedShapes = editor.getSelectedShapes()
	const hasPrompt = selectedShapes.length === 1 && (selectedShapes[0].meta as any)?.generatedPrompt

	if (selectionType.type === 'none' && !hasPrompt) {
		return null
	}

	return (
		<div className="contextual-toolbar">
			{/* Show prompt display for any single shape with generatedPrompt metadata */}
			{hasPrompt && <PromptDisplay selectedShapes={selectedShapes} />}

			{/* Show appropriate tool based on selection type */}
			{selectionType.type === 'drawings' && (
				<DoodleToImageTool selectedShapes={selectionType.shapes} />
			)}

			{selectionType.type === 'image' && <SingleImageTool selectedShapes={selectionType.shapes} />}

			{selectionType.type === 'generated' && selectionType.shapes[0].type === 'video' && (
				<div className="video-info">
					<p className="info-text">Generated video</p>
				</div>
			)}
		</div>
	)
}
