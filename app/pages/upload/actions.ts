"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

function getGenAI() {
    const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!API_KEY) {
        throw new Error('GOOGLE_API_KEY (or GEMINI_API_KEY) environment variable is not set in .env.local');
    }
    return new GoogleGenerativeAI(API_KEY);
}

export interface VideoEvent {
    isDangerous: boolean;
    timestamp: string;
    description: string;
}

export async function detectEvents(base64Image: string): Promise<{ events: VideoEvent[], rawResponse: string, error?: string }> {
    console.log('Starting frame analysis...');
    try {
        if (!base64Image) {
            throw new Error("No image data provided");
        }

        const base64Data = base64Image.split(',')[1];
        if (!base64Data) {
            throw new Error("Invalid image data format");
        }

        const genAI = getGenAI();
        const candidateModels = Array.from(new Set([
            process.env.GEMINI_MODEL,
            "gemini-flash-latest",
            "gemini-pro-latest",
            "gemini-3.6-flash",
            "gemini-2.5-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
        ].filter(Boolean))) as string[];

        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg'
            },
        };

        console.log('Sending image to API...', { imageSize: base64Data.length });
        const prompt = `Analyze this frame and determine if any of these specific dangerous situations are occurring:

1. Medical Emergencies:
- Person unconscious or lying motionless
- Person clutching chest/showing signs of heart problems
- Seizures or convulsions
- Difficulty breathing or choking

2. Falls and Injuries:
- Person falling or about to fall
- Person on the ground after a fall
- Signs of injury or bleeding
- Limping or showing signs of physical trauma

3. Distress Signals:
- Person calling for help or showing distress
- Panic attacks or severe anxiety symptoms
- Signs of fainting or dizziness
- Headache or unease
- Signs of unconsciousness

4. Violence or Threats:
- Physical altercations
- Threatening behavior
- Weapons visible

5. Suspicious Activities:
- Shoplifting
- Vandalism
- Trespassing

Return a JSON object in this exact format:

{
    "events": [
        {
            "timestamp": "mm:ss",
            "description": "Brief description of what's happening in this frame",
            "isDangerous": true/false // Set to true if the event involves a fall, injury, unease, pain, accident, or concerning behavior
        }
    ]
}`;

        let result = null;
        let lastError: any = null;

        for (const modelName of candidateModels) {
            try {
                console.log(`Attempting Gemini model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                result = await model.generateContent([prompt, imagePart]);
                if (result) {
                    console.log(`Successfully generated content using model: ${modelName}`);
                    break;
                }
            } catch (err: any) {
                console.warn(`Model ${modelName} failed:`, err?.message || err);
                lastError = err;
            }
        }

        if (!result) {
            throw lastError || new Error("Failed to generate content with any Gemini model");
        }

        const response = await result.response;
        const text = response.text();
        console.log('Raw API Response:', text);

        let jsonStr = text;
        
        const codeBlockMatch = text.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
        if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1];
            console.log('Extracted JSON from code block:', jsonStr);
        } else {
            const jsonMatch = text.match(/\{[^]*\}/);  
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
                console.log('Extracted raw JSON:', jsonStr);
            }
        }

        try {
            const parsed = JSON.parse(jsonStr);
            return {
                events: parsed.events || [],
                rawResponse: text
            };
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            return {
                events: [],
                rawResponse: text,
                error: 'Failed to parse API response JSON'
            };
        }

    } catch (error: any) {
        console.error('Error in detectEvents:', error?.message || error);
        let errorMessage = error?.message || 'Error analyzing frame';
        if (errorMessage.includes('404') || errorMessage.includes('is not found')) {
            errorMessage = 'Gemini model/key error. Please check GOOGLE_API_KEY in .env.local';
        }
        return {
            events: [],
            rawResponse: '',
            error: errorMessage
        };
    }
}