import { TldrawUiIcon, useBreakpoint } from 'tldraw'
import { ChangeEvent, useCallback } from 'react'

export function RiskyButCoolAPIKeyInput() {
	const breakpoint = useBreakpoint()

	const handleFalChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
		localStorage.setItem('doodle_animator_fal_key', e.target.value)
	}, [])

	const handleOpenAIChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
		localStorage.setItem('doodle_animator_openai_key', e.target.value)
	}, [])

	const handleFalQuestionMessage = useCallback(() => {
		window.alert(
			`If you have a fal.ai API key, you can put it in this input and it will be used for image and video generation.\n\nSee https://fal.ai/dashboard/keys to get a key.\n\nPutting API keys into boxes is generally a bad idea! If you have any concerns, create an API key and then revoke it after using this site.`
		)
	}, [])

	const handleOpenAIQuestionMessage = useCallback(() => {
		window.alert(
			`Optional: If you have an OpenAI API key with Sora access, you can put it here. This will use your OpenAI credits instead of fal.ai's billing for Sora 2 animations.\n\nSee https://platform.openai.com/api-keys to get a key.\n\nNote: Sora API access is currently in limited availability. If you don't have Sora access, you can leave this blank and fal.ai will handle billing.`
		)
	}, [])

	return (
		<div className={`your-own-api-key ${breakpoint < 5 ? 'your-own-api-key__mobile' : ''}`}>
			<div className="your-own-api-key__inner">
				<div className="api-key-section">
					<label className="api-key-label">FAL API Key (Required)</label>
					<div className="input__wrapper">
						<input
							id="fal_key_input"
							defaultValue={localStorage.getItem('doodle_animator_fal_key') ?? ''}
							onChange={handleFalChange}
							spellCheck={false}
							autoCapitalize="off"
							placeholder="fal_..."
						/>
					</div>
					<button className="question__button" onClick={handleFalQuestionMessage}>
						<TldrawUiIcon icon="question" label="Question" />
					</button>
				</div>
				<div className="api-key-section">
					<label className="api-key-label">OpenAI Key (Optional - for Sora 2)</label>
					<div className="input__wrapper">
						<input
							id="openai_key_input"
							defaultValue={localStorage.getItem('doodle_animator_openai_key') ?? ''}
							onChange={handleOpenAIChange}
							spellCheck={false}
							autoCapitalize="off"
							placeholder="sk-..."
						/>
					</div>
					<button className="question__button" onClick={handleOpenAIQuestionMessage}>
						<TldrawUiIcon icon="question" label="Question" />
					</button>
				</div>
			</div>
		</div>
	)
}
