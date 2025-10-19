'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import './WelcomeAnimation.css'

export function WelcomeAnimation() {
	const [isVisible, setIsVisible] = useState(true)
	const [isFadingOut, setIsFadingOut] = useState(false)

	useEffect(() => {
		// Start fade out after 1 second
		const fadeOutTimer = setTimeout(() => {
			setIsFadingOut(true)
		}, 1000)

		// Remove component after fade out completes
		const removeTimer = setTimeout(() => {
			setIsVisible(false)
		}, 1300)

		return () => {
			clearTimeout(fadeOutTimer)
			clearTimeout(removeTimer)
		}
	}, [])

	if (!isVisible) return null

	return (
		<div className={`welcome-animation-overlay ${isFadingOut ? 'fade-out' : ''}`}>
			<div className="welcome-logo-container">
				<Image
					src="/doodlemorph-logo.png"
					alt="DoodleMorph Logo"
					width={180}
					height={180}
					priority
					className="welcome-logo"
				/>
				{/* Sparkle particles */}
				<div className="sparkle"></div>
				<div className="sparkle"></div>
				<div className="sparkle"></div>
				<div className="sparkle"></div>
				<div className="sparkle"></div>
				<div className="sparkle"></div>
			</div>
			<div className="welcome-text">Welcome to DoodleMorph</div>
		</div>
	)
}
