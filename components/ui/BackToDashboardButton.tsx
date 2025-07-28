import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react' // Import ArrowLeft icon

export function BackToDashboardButton() {
  const router = useRouter()

  const handleClick = () => {
    router.push('https://tarly.works/dashboard')
  }

  return (
    <Button 
      onClick={handleClick}
      variant="tarlyAi"
      size="default"
      className="w-full justify-start mt-2"
    >
      <ArrowLeft className="mr-2 h-4 w-4" /> {/* Add the icon here */}
      Back to Tarly AI
    </Button>
  )
} 