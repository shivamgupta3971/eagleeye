"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function MainOptionsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/protected")
  }, [router])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4"></div>
      <p className="text-gray-400">Redirecting to EagleEye dashboard...</p>
    </div>
  )
}
