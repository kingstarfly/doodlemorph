# Doodle Animator

Transform tldraw canvas into an AI-powered animation studio. Users can draw sketches, generate styled images using AI, and create animations from image sequences.

## Features

### 🎨 Doodle to Image Generation

- Draw sketches on the canvas using tldraw's drawing tools
- Select your drawing and a contextual toolbar appears
- Choose from quick style presets (Cartoon, Pixel Art, 3D Render, Sticker) or write custom prompts
- AI generates a styled, high-quality image based on your sketch

### 🎬 Images to Animation

- Generate multiple styled images of your character
- Select 2 or more images to create an animation
- AI generates a smooth video animation from your image sequence
- Download the final animation as MP4

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A fal.ai API key (get one at [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys))

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd ai-canvas-character-creator
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file and add your fal.ai API key:

```bash
NEXT_PUBLIC_FAL_KEY=your-fal-api-key-here
```

Alternatively, you can enter your API key directly in the app's input field at runtime.

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## How to Use

### Creating Styled Images

1. Use tldraw's drawing tools to sketch a character or object
2. Select your drawing (click or drag to select)
3. A contextual toolbar will appear at the bottom
4. Choose a quick style preset or type a custom prompt (max 50 characters)
5. Click "✨ Generate Image"
6. Wait for the AI to generate your styled image
7. The image will appear on the canvas next to your drawing

### Creating Animations

1. Generate 2 or more styled images using the process above
2. Select multiple images (hold Shift and click, or drag to select)
3. The animation toolbar will appear showing the selection order
4. Click "🎬 Create Animation"
5. Wait 30-60 seconds for the video to generate
6. Preview the animation in the toolbar
7. Click "📥 Download Animation" to save the MP4 file

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Canvas**: tldraw v3
- **AI**: fal.ai (flux-dev for image generation, kling-video for animations)

## Project Structure

```
app/
├── api/
│   ├── generate-image/route.ts      # Image generation API
│   └── generate-animation/route.ts  # Animation generation API
├── components/
│   ├── tools/
│   │   ├── DoodleToImageTool.tsx    # Doodle → Image UI
│   │   ├── ImageToAnimationTool.tsx # Images → Animation UI
│   │   └── tools.css                # Toolbar styling
│   ├── ToolbarContainer.tsx         # Main toolbar orchestrator
│   ├── LoadingIndicator.tsx         # Loading spinner component
│   └── RiskyButCoolAPIKeyInput.tsx  # API key input
├── lib/
│   ├── detectSelectionType.ts       # Selection analyzer
│   ├── captureShapesAsImage.ts      # Canvas export utility
│   ├── placeImageOnCanvas.ts        # Image placement utility
│   └── blobToBase64.ts              # Blob conversion
└── page.tsx                         # Main app entry
```

## API Models Used

- **Image Generation**: `fal-ai/flux/dev` - Generates high-quality styled images from sketches
- **Video Animation**: `fal-ai/kling-video/v1/standard/image-to-video` - Creates smooth animations from image sequences

## Development Notes

### Selection Detection

The app uses a smart selection detection system that shows different tools based on what's selected:

- **Drawings selected** (draw, geo, arrow shapes) → Show Doodle to Image tool
- **2+ images selected** → Show Animation tool
- **1 image selected** → (Reserved for future "Make it Talk" feature)
- **Nothing/mixed selection** → Hide toolbar

### Error Handling

All API calls include comprehensive error handling:

- API key validation before making requests
- User-friendly toast notifications for errors
- Console logging for debugging
- Timeout handling for long-running operations

## Troubleshooting

### "API Key Required" error

Make sure you've entered your fal.ai API key in either:

- The `.env.local` file as `NEXT_PUBLIC_FAL_KEY`
- The input field at the bottom of the app

### Image generation fails

- Check that your fal.ai API key is valid
- Ensure you have sufficient credits in your fal.ai account
- Try a simpler prompt if the generation times out

### Animation generation takes too long

- Video generation typically takes 30-60 seconds
- Make sure you have a stable internet connection
- If it times out, try with fewer images or simpler images

## Future Enhancements

- **Talking Characters**: Add text-to-speech and lip-sync animation
- **Asset Gallery**: History panel to browse previously generated assets
- **Advanced Prompts**: More detailed prompt templates and controls
- **Export Options**: Multiple video formats and resolutions
- **Collaborative Features**: Share and remix animations

## License

See LICENSE file for details.

## Credits

Built with:

- [tldraw](https://tldraw.dev) - Infinite canvas SDK
- [fal.ai](https://fal.ai) - AI model hosting
- [Next.js](https://nextjs.org) - React framework
