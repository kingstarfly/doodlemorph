'use client'

import { useEditor } from 'tldraw'
import { useEffect, useState } from 'react'

export function OnboardingMessage() {
	const editor = useEditor()
	const [showOnboarding, setShowOnboarding] = useState(true)

	useEffect(() => {
		const checkCanvasEmpty = () => {
			// Get all shapes on the canvas
			const shapes = editor.getCurrentPageShapes()
			// Filter out any system shapes if needed, just check if there are any user-drawn shapes
			const hasContent = shapes.length > 0
			setShowOnboarding(!hasContent)
		}

		// Check initially
		checkCanvasEmpty()

		// Listen for changes to the canvas
		const cleanup = editor.store.listen(() => {
			checkCanvasEmpty()
		})

		return () => {
			cleanup()
		}
	}, [editor])

	if (!showOnboarding) {
		return null
	}

	return (
		<div className="onboarding-message">
			<div className="onboarding-content">
				<div className="onboarding-title">How to use</div>
				<div className="onboarding-step">
					<span className="step-number">1.</span> Sketch/draw/upload
				</div>
				<div className="onboarding-step">
					<span className="step-number">2.</span> Select assets
				</div>
				<div className="onboarding-step">
					<span className="step-number">3.</span> Morph!
				</div>
			</div>
		</div>
	)
}
