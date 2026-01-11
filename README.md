# Barista Log (Kaffee Logbuch) ☕️

A smart coffee tracking application built with Next.js and powered by AI to help you dial in the perfect shot.

## Features

- **Detailed Logging**: Track every detail of your coffee brewing process, including Bean, Roaster, Grind Size, Dose (In/Out), Time, and Machine.
- **Multiple Brewing Methods**: Support for Espresso (Siebträger), French Press, Filter, Mokka Pot, Cold Brew, and more.
- **Visual Taste Profile**: Record the taste balance (Sour vs Bitter) with an intuitive visual slider.
- **AI-Powered Analysis**: Upload a photo of your coffee bag, and let Gemini AI automatically extract details like Name, Roaster, and Notes.
- **Smart Advice**: Get AI-generated feedback on your shots to improve your extraction and taste.
- **History Tracking**: Keep a history of multiple shots per coffee to see how your recipe evolves.
- **Search & Filter**: Easily find past brews by name, roaster, or brewing method.
- **Local Storage**: Your data is saved locally in your browser, ensuring privacy and persistence without a backend database for user data.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **AI/LLM**: [Google Gemini API](https://ai.google.dev/)

## Getting Started

### Prerequisites

You will need a Google Gemini API Key. You can get one from [Google AI Studio](https://aistudio.google.com/).

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd kaffee-logbuch
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. Configure Environment Variables:
   Create a `.env.local` file in the root directory and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the app.

## Project Structure

- `app/page.js`: Main application logic (Client Component). Handles state, UI, and user interactions.
- `app/api/analyze/route.js`: Server-side API route for processing image analysis with Gemini.
- `app/api/advice/route.js`: Server-side API route for generating brewing advice with Gemini.
- `app/globals.css`: Tailwind CSS imports and global styles.

## Usage

1. **Add a Coffee**: Click the "New Entry" button or the "+" icon.
2. **Scan**: Click the camera icon to upload/take a photo of your coffee bag for auto-filling details.
3. **Log Shot**: Enter your brewing parameters (Grind, Time, Ratio).
4. **Refine**: If a shot isn't perfect, use the "Get Advice" feature and adjust parameters in your next shot.
