'use client'

import dynamic from 'next/dynamic'
import 'tldraw/tldraw.css'
import { ToolbarContainer } from './components/ToolbarContainer'
import { DoodlemorphLogo } from './components/DoodlemorphLogo'
import { OnboardingMessage } from './components/OnboardingMessage'
import { WelcomeAnimation } from './components/WelcomeAnimation'

const Tldraw = dynamic(async () => (await import('tldraw')).Tldraw, {
	ssr: false,
})

export default function App() {
	return (
		<div className="editor">
			<WelcomeAnimation />
			<Tldraw persistenceKey="doodle-animator">
				<DoodlemorphLogo />
				<ToolbarContainer />
				<OnboardingMessage />
			</Tldraw>
		</div>
	)
}
