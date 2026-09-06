import { useState, useEffect } from "react"
import { Loader2, ShieldCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface SecurityAlertModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAlertComplete: () => void
  eventTitle?: string
  eventDescription?: string
}

export function SecurityAlertModal({
  open,
  onOpenChange,
  onAlertComplete,
  eventTitle,
  eventDescription,
}: SecurityAlertModalProps) {
  const [status, setStatus] = useState<"calling" | "alerted">("calling")

  useEffect(() => {
    if (open && status === "calling") {
      // Trigger security alert email notification via API
      fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: eventTitle || "Manual Security Alert",
          description: eventDescription || "Manual security alert dispatched from monitoring dashboard."
        })
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Security alert dispatched:", data)
          setStatus("alerted")
        })
        .catch((err) => {
          console.error("Failed to dispatch security alert:", err)
          setStatus("alerted")
        })

      const fallbackTimer = setTimeout(() => {
        setStatus("alerted")
      }, 2500)

      return () => clearTimeout(fallbackTimer)
    }
  }, [open, status, eventTitle, eventDescription])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">
            {status === "calling" ? "Calling Security & Sending Alert..." : "Security Alerted!"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-8">
          {status === "calling" ? (
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          ) : (
            <ShieldCheck className="h-12 w-12 text-green-500" />
          )}
        </div>
        <DialogFooter>
          {status === "alerted" && (
            <button
              onClick={() => {
                onAlertComplete()
                onOpenChange(false)
                setStatus("calling")
              }}
              className="w-full rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Close
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
