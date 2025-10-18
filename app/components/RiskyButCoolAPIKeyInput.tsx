import { TldrawUiIcon, useBreakpoint } from 'tldraw'
import { ChangeEvent, useCallback } from 'react'

export function RiskyButCoolAPIKeyInput() {
	const breakpoint = useBreakpoint()

	const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
		localStorage.setItem('doodle_animator_fal_key', e.target.value)
	}, [])

	const handleQuestionMessage = useCallback(() => {
		window.alert(
			`If you have a fal.ai API key, you can put it in this input and it will be used for image and video generation.\n\nSee https://fal.ai/dashboard/keys to get a key.\n\nPutting API keys into boxes is generally a bad idea! If you have any concerns, create an API key and then revoke it after using this site.`
		)
	}, [])

	return (
		<div className={`your-own-api-key ${breakpoint < 5 ? 'your-own-api-key__mobile' : ''}`}>
			<div className="your-own-api-key__inner">
				<div className="input__wrapper">
					<input
						id="fal_key_input"
						defaultValue={localStorage.getItem('doodle_animator_fal_key') ?? ''}
						onChange={handleChange}
						spellCheck={false}
						autoCapitalize="off"
					/>
				</div>
				<button className="question__button" onClick={handleQuestionMessage}>
					<TldrawUiIcon icon="question" label="Question" />
				</button>
			</div>
		</div>
	)
}
