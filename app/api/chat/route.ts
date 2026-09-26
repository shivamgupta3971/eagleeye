import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: Request) {
  let openaiError: string | null = null
  let geminiError: string | null = null

  try {
    const { messages, events } = await request.json()
    const lastUserMessage = messages?.[messages.length - 1]?.content || ''

    const contextMessage = events?.length > 0
      ? `Recent events:\n${events.map((event: any) => 
          `- At ${event.timestamp}: ${event.description}${event.isDangerous ? ' (⚠️ Dangerous)' : ''}`
        ).join('\n')}`
      : 'No events detected yet.'

    // 1. Try OpenAI if OPENAI_API_KEY is set
    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey })
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful security assistant monitoring a real-time video stream. You have access to detected events and can provide guidance, especially during dangerous situations. Be concise but informative."
            },
            { role: "system", content: contextMessage },
            ...(messages || [])
          ],
          temperature: 0.7,
          max_tokens: 150
        })
        const text = response.choices?.[0]?.message?.content
        if (text) {
          return NextResponse.json({ content: text, role: 'assistant' })
        }
      } catch (err: any) {
        console.warn('OpenAI request failed:', err?.message || err)
        openaiError = err?.message || 'OpenAI error'
      }
    }

    // 2. Try Gemini if GOOGLE_API_KEY / GEMINI_API_KEY is set
    const geminiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey)
        const candidateModels = ["gemini-flash-latest", "gemini-pro-latest", "gemini-3.6-flash", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
        let replyText = ""
        const prompt = `You are a helpful security assistant monitoring a video feed.\n${contextMessage}\nUser question: ${lastUserMessage}`

        for (const modelName of candidateModels) {
          try {
            const model = genAI.getGenerativeModel({ model: modelName })
            const res = await model.generateContent(prompt)
            const text = res.response.text()
            if (text) {
              replyText = text
              break
            }
          } catch (e: any) {
            geminiError = e?.message || 'Gemini error'
          }
        }

        if (replyText) {
          return NextResponse.json({ content: replyText, role: 'assistant' })
        }
      } catch (err: any) {
        console.warn('Gemini request failed:', err?.message || err)
        geminiError = err?.message || 'Gemini error'
      }
    }

    // 3. Informative explanation if keys had errors or were missing
    let explanation = `EagleEye Assistant is active! (${events?.length || 0} events monitored).\n\n`
    if (openaiError?.includes('429') || openaiError?.includes('quota')) {
      explanation += `⚠️ OpenAI returned 429 (Insufficient Quota / No Credits Remaining). Please check billing at platform.openai.com.`
    } else if (openaiError) {
      explanation += `⚠️ OpenAI error: ${openaiError}`
    } else {
      explanation += `💡 Set OPENAI_API_KEY or GOOGLE_API_KEY in .env.local to enable AI chat responses.`
    }

    return NextResponse.json({
      content: explanation,
      role: 'assistant'
    })

  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: `Failed to get chat response: ${error.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}
