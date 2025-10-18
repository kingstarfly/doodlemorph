import { DefaultSpinner } from 'tldraw'

export type LoadingIndicatorProps = {
	message?: string
}

export function LoadingIndicator(props: LoadingIndicatorProps) {
	return (
		<div className="loading-indicator">
			<DefaultSpinner />
			{props.message && <span className="loading-message">{props.message}</span>}
		</div>
	)
}
