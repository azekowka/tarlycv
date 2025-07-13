'use client'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { fixLatexDocumentFromError } from '@/app/actions'
import { useProject } from '@/contexts/ProjectContext'

function parseLatexError(error: string): string {
  const errorMessages: { [key: string]: string } = {
    "Missing File: No main.tex file found": "Missing File: No main.tex file found\n\nDetails: The main.tex file is required for LaTeX compilation."
  };

  return errorMessages[error] || error;
}

export default function LatexError({ error }: { error: string }) {
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<string | null>(null);
  const { currentlyOpen, updateDocument } = useProject();
  const parsedError = parseLatexError(error);

  const handleFixWithAI = async () => {
    if (!currentlyOpen || !updateDocument) {
      setFixResult('Cannot access document content. Please try again.');
      return;
    }

    setIsFixing(true);
    setFixResult(null);
    
    try {
      console.log('🤖 Sending LaTeX error to AI for automatic fixing...');
      
      const result = await fixLatexDocumentFromError(currentlyOpen.content, parsedError);
      
      if (result.wasFixed) {
        console.log('✅ AI successfully fixed the document');
        console.log('📝 Explanation:', result.explanation);
        
        // Automatically apply the fix to the document
        updateDocument(result.fixedContent);
        
        setFixResult(`✅ Document automatically fixed!\n\n${result.explanation}`);
      } else {
        console.log('ℹ️ AI could not fix the document');
        setFixResult(`ℹ️ ${result.explanation}\n\nThe document may need manual review.`);
      }
      
    } catch (error) {
      console.error('❌ Error getting AI fix:', error);
      setFixResult('Failed to get AI assistance. Please check the error manually.');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Alert variant="destructive" className="m-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="text-red-600 dark:text-red-200">LaTeX Compilation Error</AlertTitle>
      <AlertDescription className="space-y-4">
        <p className="text-sm text-muted-foreground">
          LaTeX compilation failed. Click the button below to automatically fix the document with AI.
        </p>
        
        <Button 
          onClick={handleFixWithAI}
          disabled={isFixing || !updateDocument}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Wand2 className="h-4 w-4" />
          {isFixing ? 'Fixing Document...' : 'Fix with AI'}
        </Button>
        
        {fixResult && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <h4 className="font-medium text-sm mb-2">AI Result:</h4>
            <div className="text-sm whitespace-pre-wrap text-foreground/90">
              {fixResult}
            </div>
          </div>
        )}
        
        {/* Optional: Show original error in a collapsible section */}
        <details className="mt-2">
          <summary className="text-sm cursor-pointer text-muted-foreground hover:text-foreground">
            Show original error details
          </summary>
          <div className="mt-2 p-2 bg-background border rounded text-xs">
            <pre className="whitespace-pre-wrap font-mono">{parsedError}</pre>
          </div>
        </details>
      </AlertDescription>
    </Alert>
  )
}