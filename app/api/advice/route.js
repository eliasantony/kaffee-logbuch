import { NextResponse } from 'next/server';

const API_KEY = process.env.GEMINI_API_KEY; 

export async function POST(req) {
  try {
    if (!API_KEY) {
        return NextResponse.json({ error: 'Server API Key missing' }, { status: 500 });
    }

    const body = await req.json();
    const { name, roaster, machine, grind, method, time, gramsIn, gramsOut, tasteProfile, notes } = body;

    const prompt = `
      Ich habe einen Kaffee zubereitet und möchte Tipps zur Optimierung.
      Hier sind die Daten:
      - Bohne: ${name}
      - Röster: ${roaster}
      - Maschine: ${machine}
      - Methode: ${method}
      - Mahlgrad: ${grind}
      - Zeit: ${time} Sekunden
      - In: ${gramsIn}g
      - Out: ${gramsOut}g
      - Geschmack (0=Sauer, 50=Gut, 100=Bitter): ${tasteProfile}
      - Notizen: ${notes}

      Bitte gib mir eine kurze, prägnante Analyse und 1-2 konkrete Verbesserungsvorschläge (z.B. feiner mahlen, länger beziehen, Ratio ändern).
      Antworte direkt mit dem Ratschlag, ohne Einleitung.
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt }
            ]
          }]
        })
    });

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to generate advice' }, { status: 500 });
  }
}
