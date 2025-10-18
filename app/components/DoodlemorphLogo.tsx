import Image from 'next/image'

export function DoodlemorphLogo() {
	return (
		<div className="doodlemorph-logo">
			<Image
				src="/doodlemorph-logo.png"
				alt="DoodleMorph Logo"
				width={20}
				height={20}
				priority
				className="doodlemorph-logo-image"
			/>
			<span className="doodlemorph-text">DoodleMorph</span>
		</div>
	)
}
