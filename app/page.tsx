'use client'

import dynamic from 'next/dynamic'
import 'tldraw/tldraw.css'
import { RiskyButCoolAPIKeyInput } from './components/RiskyButCoolAPIKeyInput'
import { ToolbarContainer } from './components/ToolbarContainer'

const Tldraw = dynamic(async () => (await import('tldraw')).Tldraw, {
	ssr: false,
})

export default function App() {
	return (
		<div className="editor">
			<Tldraw persistenceKey="doodle-animator">
				<RiskyButCoolAPIKeyInput />
				<ToolbarContainer />
			</Tldraw>
		</div>
	)
}
