import { useEditor } from 'tldraw'
import { useEffect, useState } from 'react'
import { detectSelectionType, SelectionType } from '../lib/detectSelectionType'
import { DoodleToImageTool } from './tools/DoodleToImageTool'
import { SingleImageTool } from './tools/SingleImageTool'
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

	if (selectionType.type === 'none') {
		return null
	}

	return (
		<div className="contextual-toolbar">
			{selectionType.type === 'drawings' && (
				<DoodleToImageTool selectedShapes={selectionType.shapes} />
			)}

			{selectionType.type === 'image' && <SingleImageTool selectedShapes={selectionType.shapes} />}
		</div>
	)
}
