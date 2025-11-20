import { NextResponse } from 'next/server';

const API_KEY = process.env.GEMINI_API_KEY; 

export async function POST(req) {
  try {
    if (!API_KEY) {
        return NextResponse.json({ error: 'Server API Key missing' }, { status: 500 });
    }

    const { base64Data } = await req.json();

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Analysiere dieses Bild einer Kaffeepackung. Extrahiere den Namen der Bohne (Name), den Röster (Roaster) und Geschmacksnoten (Notes). Gib NUR ein JSON zurück im Format: { \"name\": \"...\", \"roaster\": \"...\", \"notes\": \"...\" }." },
              { inlineData: { mimeType: "image/jpeg", data: base64Data } }
            ]
          }]
        })
    });

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to analyze' }, { status: 500 });
  }
}