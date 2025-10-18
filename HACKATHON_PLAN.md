# Doodle Animator - 24h Hackathon Implementation Plan

## Project Overview

Transform tldraw canvas into AI-powered animation studio. Users draw → generate styled images → animate sequences.

**Demo Goal**: 2-minute video showing full workflow: sketch → styled images → animation

## Architecture: Contextual Tool System

Tools appear based on selection:

- **Drawing selected** → Generate Image tool (with text input)
- **2+ images selected** → Create Animation tool
- **1 image selected** → Make it Talk tool (STRETCH GOAL)

## Layout Design

```
┌──────────────────────────────────────────────────────┐
│ Doodle Animator           [fal.ai Key: __________]  │ ← Top bar
├──────────────────────────────────────────────────────┤
│                                                      │
│                   TLDRAW CANVAS                      │
│                 (user draws here)                    │
│                                                      │
│   ┌────────────────────────────────────┐            │
│   │ Contextual Toolbar (appears here)  │ ← Dynamic  │
│   └────────────────────────────────────┘            │
└──────────────────────────────────────────────────────┘
```

### Toolbar States

**STATE 1: Drawing Selected**

```
┌───────────────────────────────────────────────────┐
│ Style prompt: [_______________] (50 char max)     │
│ Quick styles: [🎨 Cartoon] [🎮 Pixel] [🌟 3D]    │
│                              [✨ Generate Image]  │
└───────────────────────────────────────────────────┘
```

**STATE 2: Multiple Images Selected**

```
┌───────────────────────────────────────────────────┐
│ Selection order: [1] → [2] → [3]                  │
│ [🎬 Create Animation]      [↻ Reverse]           │
└───────────────────────────────────────────────────┘
```

**STATE 3: Single Image Selected (STRETCH)**

```
┌───────────────────────────────────────────────────┐
│ Dialogue: [_______________] (100 char max)        │
│                              [🎙️ Make it Talk]   │
└───────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation & Backend Setup

### API Routes (create in `/app/api/`)

#### `/api/generate-image/route.ts`

**Purpose**: Call fal.ai flux-pro for image generation
**Checklist**:

- [ ] Accept POST with `{ imageBase64: string, prompt: string }`
- [ ] Get fal.ai key from env or request body
- [ ] Call fal.ai flux-pro model (or similar image-to-image)
- [ ] Combine user prompt with base prompt: `"high-quality character art, clean lines, ${userPrompt}"`
- [ ] Return `{ success: boolean, imageUrl: string, error?: string }`
- [ ] Add error handling for API failures
- [ ] Test with sample base64 image

**fal.ai Integration**:

```typescript
import * as fal from '@fal-ai/serverless-client'

fal.config({ credentials: process.env.FAL_API_KEY })

const result = await fal.subscribe('fal-ai/flux-pro', {
	input: {
		image_url: imageBase64, // or upload
		prompt: finalPrompt,
		// other params
	},
})
```

#### `/api/generate-animation/route.ts`

**Purpose**: Call fal.ai video model for animation
**Checklist**:

- [ ] Accept POST with `{ imageUrls: string[], fps?: number }`
- [ ] Get fal.ai key from env or request body
- [ ] Call fal.ai wan-2-1 or kling-video model
- [ ] Handle multiple images as sequence
- [ ] Return `{ success: boolean, videoUrl: string, error?: string }`
- [ ] Add timeout handling (video gen can take 60s+)
- [ ] Test with 2-4 image URLs

**Model options**:

- `fal-ai/wan-2-1` - good for image sequences
- `fal-ai/kling-video/v1/standard/image-to-video` - alternative

#### `/api/generate-talking/route.ts` (STRETCH)

**Purpose**: Two-step process: text-to-speech → lip-sync video
**Checklist**:

- [ ] Accept POST with `{ imageUrl: string, text: string }`
- [ ] Step 1: Call ElevenLabs TTS API → get audio URL
- [ ] Step 2: Call fal.ai omnium-human with image + audio
- [ ] Return `{ success: boolean, videoUrl: string, audioUrl: string, error?: string }`
- [ ] Handle both API failures gracefully
- [ ] Test with sample image and short phrase

### Utilities (create in `/app/lib/`)

#### `detectSelectionType.ts`

**Purpose**: Analyze what user has selected
**Checklist**:

- [ ] Export function `detectSelectionType(editor: Editor)`
- [ ] Get selected shapes via `editor.getSelectedShapes()`
- [ ] Detect drawings: check for 'draw', 'geo', 'arrow' shape types
- [ ] Detect images: check for 'image' shape type or custom image shapes
- [ ] Return `{ type: 'drawings' | 'images' | 'image' | 'none', count: number, shapes: TLShape[] }`
- [ ] Handle edge cases (mixed selection = 'none')

```typescript
export function detectSelectionType(editor: Editor) {
	const shapes = editor.getSelectedShapes()
	const drawings = shapes.filter((s) => ['draw', 'geo', 'arrow'].includes(s.type))
	const images = shapes.filter((s) => s.type === 'image')

	if (drawings.length > 0) return { type: 'drawings', count: 1, shapes: drawings }
	if (images.length >= 2) return { type: 'images', count: images.length, shapes: images }
	if (images.length === 1) return { type: 'image', count: 1, shapes: images }
	return { type: 'none', count: 0, shapes: [] }
}
```

#### `captureShapesAsImage.ts`

**Purpose**: Export selected shapes to base64 PNG
**Checklist**:

- [ ] Export function `captureShapesAsImage(editor: Editor, shapes: TLShape[])`
- [ ] Get bounding box of shapes
- [ ] Use tldraw's export API: `editor.getSvgString()` or similar
- [ ] Convert to PNG via canvas
- [ ] Return base64 string
- [ ] Reuse existing patterns from `makeReal.tsx` and `blobToBase64.ts`

#### `placeImageOnCanvas.ts`

**Purpose**: Add generated image to canvas
**Checklist**:

- [ ] Export function `placeImageOnCanvas(editor: Editor, imageUrl: string, nearShapes: TLShape[])`
- [ ] Calculate position: offset right/below from source shapes
- [ ] Create image shape via `editor.createShape()`
- [ ] Set appropriate size (scale to fit canvas)
- [ ] Return created shape ID

### API Key Management

#### Update `app/components/RiskyButCoolAPIKeyInput.tsx`

**Checklist**:

- [ ] Rename localStorage key to `doodle_animator_fal_key`
- [ ] Update placeholder text: "Enter your fal.ai API key"
- [ ] Update help message with fal.ai docs link
- [ ] Support env var `NEXT_PUBLIC_FAL_KEY`
- [ ] Keep similar UI pattern to existing component

---

## Phase 2: Tool #1 - Doodle to Image Generation

### Create `app/components/tools/DoodleToImageTool.tsx`

**Purpose**: Contextual toolbar for generating styled images from drawings

**Checklist**:

- [ ] Component receives `selectedShapes: TLShape[]` as prop
- [ ] State: `stylePrompt` (string, max 50 chars)
- [ ] State: `isGenerating` (boolean)
- [ ] State: `progress` (string for status messages)
- [ ] Text input with maxLength={50}
- [ ] Placeholder: "e.g., cartoon style, pixel art, 3D render..."
- [ ] Generate button (disabled while generating)
- [ ] Quick style preset buttons
- [ ] Loading indicator component when generating

**Preset Buttons**:

```typescript
const STYLE_PRESETS = [
	{ emoji: '🎨', label: 'Cartoon', prompt: 'cartoon character, vibrant colors' },
	{ emoji: '🎮', label: 'Pixel Art', prompt: 'pixel art sprite, retro game style' },
	{ emoji: '🌟', label: '3D Render', prompt: '3D rendered character, Pixar style' },
	{ emoji: '🖼️', label: 'Sticker', prompt: 'die-cut sticker, white border' },
]
```

**Generate Flow**:

```typescript
const handleGenerate = async () => {
	setIsGenerating(true)
	setProgress('Capturing drawing...')

	// 1. Capture drawing as image
	const imageBase64 = await captureShapesAsImage(editor, selectedShapes)

	setProgress('Generating styled image...')

	// 2. Call API
	const response = await fetch('/api/generate-image', {
		method: 'POST',
		body: JSON.stringify({ imageBase64, prompt: stylePrompt }),
	})

	const { imageUrl, error } = await response.json()

	if (error) {
		addToast({ title: 'Generation failed', description: error })
		return
	}

	setProgress('Placing on canvas...')

	// 3. Place on canvas
	await placeImageOnCanvas(editor, imageUrl, selectedShapes)

	setIsGenerating(false)
	addToast({ title: 'Image generated!', icon: 'check' })
}
```

**UI Layout**:

```tsx
<div className="doodle-to-image-tool">
	<div className="prompt-input-row">
		<input
			type="text"
			value={stylePrompt}
			onChange={(e) => setStylePrompt(e.target.value)}
			maxLength={50}
			placeholder="e.g., cartoon style, pixel art, 3D render..."
			disabled={isGenerating}
		/>
		<button onClick={handleGenerate} disabled={isGenerating}>
			✨ Generate Image
		</button>
	</div>

	<div className="preset-buttons">
		{STYLE_PRESETS.map((preset) => (
			<button
				key={preset.label}
				onClick={() => setStylePrompt(preset.prompt)}
				disabled={isGenerating}
			>
				{preset.emoji} {preset.label}
			</button>
		))}
	</div>

	{isGenerating && <LoadingIndicator message={progress} />}
</div>
```

### Create `app/components/LoadingIndicator.tsx`

**Checklist**:

- [ ] Show animated spinner or progress bar
- [ ] Display status message prop
- [ ] Optional: estimated time remaining
- [ ] Match tldraw's design system
- [ ] Use tldraw's toast/notification patterns

---

## Phase 3: Tool #2 - Images to Animation

### Create `app/components/tools/ImageToAnimationTool.tsx`

**Purpose**: Convert sequence of images into animated video

**Checklist**:

- [ ] Component receives `selectedShapes: TLShape[]` (2+ images)
- [ ] State: `isGenerating` (boolean)
- [ ] State: `progress` (string)
- [ ] Display selection order visually: [1] → [2] → [3]
- [ ] "Create Animation" button
- [ ] Optional: "Reverse Order" button
- [ ] Loading indicator during generation
- [ ] Download button when complete

**Selection Order Display**:

```typescript
// tldraw provides selection order automatically
const orderedShapes = selectedShapes // already in selection order

return (
	<div className="selection-order">
		{orderedShapes.map((shape, idx) => (
			<span key={shape.id}>
				[{idx + 1}] {idx < orderedShapes.length - 1 && '→'}
			</span>
		))}
	</div>
)
```

**Generate Flow**:

```typescript
const handleCreateAnimation = async () => {
	setIsGenerating(true)
	setProgress('Preparing images...')

	// 1. Extract image URLs from shapes
	const imageUrls = selectedShapes.map((shape) => {
		// Get URL from shape props
		return shape.props.url || shape.props.src
	})

	setProgress('Creating animation (30-60s)...')

	// 2. Call API
	const response = await fetch('/api/generate-animation', {
		method: 'POST',
		body: JSON.stringify({ imageUrls, fps: 8 }),
	})

	const { videoUrl, error } = await response.json()

	if (error) {
		addToast({ title: 'Animation failed', description: error })
		return
	}

	setProgress('Done!')

	// 3. Show download button or place video on canvas
	setGeneratedVideoUrl(videoUrl)

	setIsGenerating(false)
	addToast({ title: 'Animation ready!', icon: 'check' })
}
```

**Video Result Handling** (two options):

**Option A: Download Button (SIMPLER)**

```tsx
{
	generatedVideoUrl && (
		<div className="video-result">
			<video src={generatedVideoUrl} controls width={300} />
			<a href={generatedVideoUrl} download="animation.mp4">
				📥 Download Animation
			</a>
		</div>
	)
}
```

**Option B: Place on Canvas (MORE COMPLEX)**

```typescript
// Create video shape on canvas
// Requires custom video shape implementation (like PreviewShape)
// Skip for hackathon unless time permits
```

**Recommendation**: Use Option A (download button) for speed

---

## Phase 4: Main Toolbar Container

### Create `app/components/ToolbarContainer.tsx`

**Purpose**: Detect selection and show appropriate tool

**Checklist**:

- [ ] Use `useEditor()` hook to get tldraw editor instance
- [ ] Listen to selection changes via `editor.on('change', callback)`
- [ ] Call `detectSelectionType()` on each change
- [ ] Render appropriate tool component based on type
- [ ] Position toolbar contextually (near selection or fixed position)
- [ ] Handle "none" selection (hide toolbar)

**Implementation**:

```typescript
export function ToolbarContainer() {
	const editor = useEditor()
	const [selectionType, setSelectionType] = useState({ type: 'none', count: 0, shapes: [] })

	useEffect(() => {
		const handleChange = () => {
			const detected = detectSelectionType(editor)
			setSelectionType(detected)
		}

		// Check immediately
		handleChange()

		// Listen to changes
		editor.on('change', handleChange)

		return () => editor.off('change', handleChange)
	}, [editor])

	if (selectionType.type === 'none') return null

	return (
		<div className="contextual-toolbar">
			{selectionType.type === 'drawings' && (
				<DoodleToImageTool selectedShapes={selectionType.shapes} />
			)}

			{selectionType.type === 'images' && (
				<ImageToAnimationTool selectedShapes={selectionType.shapes} />
			)}

			{selectionType.type === 'image' && (
				<TalkingCharacterTool selectedShape={selectionType.shapes[0]} />
			)}
		</div>
	)
}
```

### Update `app/page.tsx`

**Checklist**:

- [ ] Import `ToolbarContainer`
- [ ] Add to Tldraw children (like RiskyButCoolAPIKeyInput)
- [ ] Update components prop if needed
- [ ] Test toolbar appears/disappears on selection

```tsx
<Tldraw persistenceKey="doodle-animator" components={components} shapeUtils={shapeUtils}>
	<APIKeyInput />
	<ToolbarContainer />
</Tldraw>
```

---

## Phase 5: UI/UX Polish

### Styling

**Checklist**:

- [ ] Create `app/components/tools/tools.css` for toolbar styles
- [ ] Match tldraw design tokens (use CSS variables from tldraw)
- [ ] Ensure toolbar is visible over canvas (z-index)
- [ ] Add hover/focus states to buttons
- [ ] Style text inputs consistently
- [ ] Add loading spinner animations
- [ ] Ensure mobile responsive (breakpoint checks)

**Toolbar Positioning Options**:

```css
/* Option 1: Fixed bottom toolbar */
.contextual-toolbar {
	position: fixed;
	bottom: 20px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 1000;
	background: white;
	border-radius: 8px;
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
	padding: 12px;
}

/* Option 2: Floating near selection */
.contextual-toolbar {
	position: absolute;
	/* Calculate position based on selection bounds */
}
```

### Loading States

**Checklist**:

- [ ] Show spinner during generation
- [ ] Display current step ("Generating...", "Processing...", "Almost done...")
- [ ] Optional: progress bar (if fal.ai provides progress)
- [ ] Disable buttons during generation
- [ ] Show estimated time ("~30 seconds remaining")

### Error Handling

**Checklist**:

- [ ] Catch all API errors
- [ ] Show user-friendly error toasts
- [ ] Log errors to console for debugging
- [ ] Handle timeout errors (video gen can be slow)
- [ ] Validate API key before requests
- [ ] Handle network errors gracefully

**Error Toast Pattern**:

```typescript
try {
	// API call
} catch (error) {
	addToast({
		icon: 'warning-triangle',
		title: 'Generation failed',
		description: error.message.slice(0, 100),
	})
	console.error('Full error:', error)
}
```

### Success Feedback

**Checklist**:

- [ ] Show success toast after generation
- [ ] Brief animation/highlight on new canvas items
- [ ] Clear loading states
- [ ] Auto-deselect old selection (optional)
- [ ] Focus/pan to new generated content (optional)

---

## Phase 6: Testing & Demo Preparation

### End-to-End Testing

**Checklist**:

- [ ] Test full workflow: draw → generate → animate
- [ ] Test with different drawing types (simple, complex, colored)
- [ ] Test with different prompt lengths (empty, 10 chars, 50 chars)
- [ ] Test with 2, 3, 4+ images for animation
- [ ] Test error cases (invalid API key, network failure)
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Test mobile responsiveness
- [ ] Verify generated assets quality

### Demo Content Preparation

**Checklist**:

- [ ] Create 3-4 test doodles in advance:
  - Simple character (stick figure → cartoon)
  - Animal (basic shape → detailed)
  - Object (rough → polished)
- [ ] Test prompts for each:
  - "cartoon character, vibrant colors"
  - "pixel art sprite, retro game"
  - "3D rendered, Pixar style"
- [ ] Pre-generate some examples to show immediately
- [ ] Prepare demo script (see below)

### Demo Script (2 minutes)

**0:00-0:15** - Introduction

- "Doodle Animator turns your sketches into animations"
- Show blank canvas

**0:15-0:45** - Feature 1: Image Generation

- Draw simple character doodle (15s)
- Type "cartoon style" in prompt
- Click Generate (show result)
- Generate 2 more variations: "pixel art", "3D render"

**0:45-1:30** - Feature 2: Animation

- Select 3 generated images
- Show selection order indicator
- Click "Create Animation"
- Show loading progress
- Display/download result

**1:30-1:50** - Quick showcase

- Show another pre-made example
- Highlight key features (text prompts, easy selection)

**1:50-2:00** - Closing

- "Built with tldraw + fal.ai"
- Show GitHub/project link

### Recording Setup

**Checklist**:

- [ ] Clean browser (close unnecessary tabs)
- [ ] Set zoom level for visibility (125%)
- [ ] Prepare OBS/screen recording settings
- [ ] Test audio if doing voiceover
- [ ] Do 2-3 practice runs
- [ ] Record 3-4 takes, pick best one
- [ ] Edit: add title card, trim pauses
- [ ] Export as MP4, upload to YouTube

### Deployment

**Checklist**:

- [ ] Push code to GitHub
- [ ] Deploy to Vercel:
  - Connect GitHub repo
  - Add env vars: `FAL_KEY`, `NEXT_PUBLIC_FAL_KEY`
  - Deploy
- [ ] Test deployed version
- [ ] Update README with:
  - Project description
  - Demo video link
  - Setup instructions
  - API key requirements

---

## Phase 7: Stretch Goal - Talking Characters

**ONLY attempt if Phases 1-5 are complete and stable**

### Create `app/components/tools/TalkingCharacterTool.tsx`

**Checklist**:

- [ ] Component receives single image shape
- [ ] Text input for dialogue (100 char max)
- [ ] "Make it Talk" button
- [ ] Two-stage loading indicator:
  - "Generating voice..." (ElevenLabs)
  - "Creating video..." (fal.ai)
- [ ] Display result with download button

### Create `app/api/generate-talking/route.ts`

**Checklist**:

- [ ] Step 1: Call ElevenLabs TTS API
  - Send dialogue text
  - Get audio file URL
- [ ] Step 2: Call fal.ai omnium-human
  - Send image URL + audio URL
  - Get lip-synced video
- [ ] Return video URL
- [ ] Handle both API failures

**ElevenLabs Integration**:

```typescript
const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/{voice_id}', {
	method: 'POST',
	headers: {
		'xi-api-key': ELEVENLABS_KEY,
		'Content-Type': 'application/json',
	},
	body: JSON.stringify({
		text: dialogue,
		model_id: 'eleven_monolingual_v1',
	}),
})

const audioBlob = await response.blob()
// Upload to temporary storage or convert to base64
```

**fal.ai Lip Sync**:

```typescript
const result = await fal.subscribe('fal-ai/omnium-human', {
	input: {
		image_url: imageUrl,
		audio_url: audioUrl,
	},
})

return result.video.url
```

---

## Technical Reference

### fal.ai Models to Use

**Image Generation**:

- `fal-ai/flux-pro` - High quality image generation
- `fal-ai/flux-pro/v1.1` - Latest version
- Alternative: `fal-ai/flux/dev` (faster, lower quality)

**Video/Animation**:

- `fal-ai/wan-2-1` - Image sequence to video
- `fal-ai/kling-video/v1/standard/image-to-video` - Alternative
- For talking: `fal-ai/omnium-human` - Lip sync video

### Environment Variables

```bash
# .env.local
FAL_KEY=your-fal-api-key
NEXT_PUBLIC_FAL_KEY=your-fal-api-key  # If using client-side
ELEVENLABS_KEY=your-elevenlabs-key    # For stretch goal
```

### Key tldraw APIs

**Selection**:

```typescript
editor.getSelectedShapes() // Get current selection
editor.setSelectedShapes([shapeId]) // Change selection
editor.getShapePageBounds(shape) // Get shape position/size
```

**Shape Creation**:

```typescript
editor.createShape({
	type: 'image',
	x: 100,
	y: 100,
	props: {
		url: imageUrl,
		w: 400,
		h: 400,
	},
})
```

**Export**:

```typescript
const svg = await editor.getSvg([shapeId])
// Convert SVG to PNG via canvas
```

**Events**:

```typescript
editor.on('change', callback)
editor.off('change', callback)
```

### Dependencies to Add

```json
{
	"dependencies": {
		"@fal-ai/serverless-client": "^0.14.0"
	}
}
```

---

## Success Criteria

**Must Have**:

- ✅ User can draw and generate styled image with text prompt
- ✅ User can select 2+ images and create animation
- ✅ Clear, intuitive contextual UI
- ✅ Proper loading states and error handling
- ✅ Deployed and working on public URL
- ✅ 2-minute demo video recorded

**Nice to Have**:

- ✅ Quick style preset buttons
- ✅ Selection order indicators
- ✅ Download buttons for all assets
- ✅ Polished animations and transitions

**Stretch Goals**:

- 🎯 Talking character feature working
- 🎯 Asset gallery/history panel
- 🎯 Advanced prompt templates

---

## Common Pitfalls to Avoid

1. **Don't over-engineer**: Use simple download buttons instead of complex video shapes
2. **Test APIs early**: Verify fal.ai integration before building UI
3. **Handle timeouts**: Video generation can take 60+ seconds
4. **Clear loading states**: Users need feedback during long operations
5. **Validate inputs**: Check API keys before expensive operations
6. **Start simple**: Get basic flow working before adding presets/polish
7. **Time-box features**: If stuck >30min, move to next feature and return later
8. **Test the demo**: Record practice runs to ensure smooth presentation

---

## File Structure Summary

```
app/
├── api/
│   ├── generate-image/
│   │   └── route.ts           ← fal.ai image generation
│   ├── generate-animation/
│   │   └── route.ts           ← fal.ai video generation
│   └── generate-talking/
│       └── route.ts           ← ElevenLabs + fal.ai (stretch)
│
├── components/
│   ├── tools/
│   │   ├── DoodleToImageTool.tsx      ← Feature 1
│   │   ├── ImageToAnimationTool.tsx   ← Feature 2
│   │   ├── TalkingCharacterTool.tsx   ← Feature 3 (stretch)
│   │   └── tools.css                  ← Styling
│   ├── ToolbarContainer.tsx           ← Main orchestrator
│   ├── LoadingIndicator.tsx           ← Progress UI
│   └── APIKeyInput.tsx                ← Updated for fal.ai
│
└── lib/
    ├── detectSelectionType.ts         ← Selection analyzer
    ├── captureShapesAsImage.ts        ← Export utility
    ├── placeImageOnCanvas.ts          ← Import utility
    └── (existing files...)            ← Keep makeReal.tsx for reference
```

---

## Quick Start for Implementation

1. **Start here**: Phase 1 API routes - test with curl/Postman first
2. **Then**: Build `detectSelectionType.ts` and test in console
3. **Then**: Create `ToolbarContainer` with basic detection (no tools yet)
4. **Then**: Build `DoodleToImageTool` (simplest version, no presets)
5. **Then**: Build `ImageToAnimationTool` (basic version)
6. **Finally**: Add polish (presets, better UI, error handling)

**Test after each step** - don't build everything then test!
