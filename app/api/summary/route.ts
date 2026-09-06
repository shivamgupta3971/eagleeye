import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: Request) {
  try {
    const { keyMoments } = await request.json()

    const momentsText = (keyMoments || []).map((moment: any) => 
      `Video: ${moment.videoName}\nTimestamp: ${moment.timestamp}\nDescription: ${moment.description}\nDangerous: ${moment.isDangerous ? 'Yes' : 'No'}\n`
    ).join('\n')

    // 1. Try OpenAI if key is set
    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey })
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an expert at analyzing video safety data. Provide concise, insightful summaries of video analysis data, focusing on safety patterns and potential concerns."
            },
            {
              role: "user",
              content: `Here are the key moments from video analysis sessions. Please provide a concise summary:\n\n${momentsText}\n\nPlease format:\n1. Overall Summary\n2. Key Safety Concerns\n3. Notable Patterns`
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })

        const summaryText = response.choices?.[0]?.message?.content
        if (summaryText) {
          return NextResponse.json({ summary: summaryText })
        }
      } catch (err) {
        console.warn('OpenAI summary failed, trying Gemini:', err)
      }
    }

    // 2. Try Gemini if key is set
    const geminiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey)
        const candidateModels = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
        const prompt = `Analyze these video safety key moments and provide a concise summary with: 1. Overall Summary, 2. Key Safety Concerns, 3. Notable Patterns.\n\nKey Moments:\n${momentsText}`

        for (const modelName of candidateModels) {
          try {
            const model = genAI.getGenerativeModel({ model: modelName })
            const res = await model.generateContent(prompt)
            const text = res.response.text()
            if (text) {
              return NextResponse.json({ summary: text })
            }
          } catch (e) {
            // try next model
          }
        }
      } catch (err) {
        console.warn('Gemini summary failed:', err)
      }
    }

    // 3. Fallback mock summary
    const summary = `1. Overall Summary\nAnalyzed ${(keyMoments || []).length} key video moments. System monitoring is active.\n\n2. Key Safety Concerns\nReview dangerous events flagged in the timeline for detailed incident reports.\n\n3. Notable Patterns\nMonitoring stream stability and event distributions across recorded camera sessions.`

    return NextResponse.json({ summary })
  } catch (error: any) {
    console.error('Error generating summary:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
