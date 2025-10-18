import { TLShape } from 'tldraw'
import './tools/tools.css'

export type PromptDisplayProps = {
	selectedShapes: TLShape[]
}

export function PromptDisplay({ selectedShapes }: PromptDisplayProps) {
	// This component assumes the parent has already checked that:
	// - There is exactly 1 selected shape
	// - That shape has generatedPrompt metadata
	const shape = selectedShapes[0]
	const prompt = (shape.meta as any)?.generatedPrompt

	return (
		<div className="prompt-display">
			<div className="prompt-display-header">
				<span className="prompt-display-icon">💭</span>
				<span className="prompt-display-title">Generation Prompt</span>
			</div>
			<div className="prompt-display-content">
				<p className="prompt-text">{prompt}</p>
			</div>
		</div>
	)
}
