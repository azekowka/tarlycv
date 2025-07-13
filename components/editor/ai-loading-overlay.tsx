'use client'

import { CircularBarsSpinnerLoader } from '@/components/ui/circular-bars-spinner'
import { TextShimmer } from '@/components/ui/text-shimmer'

interface AILoadingOverlayProps {
  isVisible: boolean
  message?: string
}

export const AILoadingOverlay = ({ isVisible, message = "AI is processing your request..." }: AILoadingOverlayProps) => {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-4">
        <CircularBarsSpinnerLoader />
        <div className="text-center">
          <TextShimmer className="text-sm font-medium block" duration={2.5}>
            {message}
          </TextShimmer>
          <TextShimmer className="text-xs mt-1 block" duration={3}>
            Please wait while we generate your response...
          </TextShimmer>
        </div>
      </div>
    </div>
  )
} 