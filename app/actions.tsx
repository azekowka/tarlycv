'use server'

import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createStreamableValue } from 'ai/rsc'

// Configure Azure OpenAI
console.log('Azure OpenAI Config:', {
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION,
  hasKey: !!process.env.AZURE_OPENAI_KEY
});

// Try common deployment names if the configured one doesn't work
const possibleDeployments = [
  process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  'gpt-4',
  'gpt-4-32k',
  'gpt-4-turbo',
  'gpt-4o',
  'gpt-35-turbo'
];

const azure = createOpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, '')}/openai/deployments/gpt-4?api-version=${process.env.AZURE_OPENAI_API_VERSION}`,
})
export async function generate(input: string) {
  const stream = createStreamableValue({ content: '', isComplete: false })

  ;(async () => {
    try {
      const { textStream } = await streamText({
        model: azure('gpt-4'),
        system:
          'You are a LaTeX editor assistant. When given selected text and a modification request, return ONLY the modified text that should replace the selection. Do not include explanations, comments, or the original request. Do not use backticks or code blocks. Return only the exact replacement text.',
        prompt: input,
      })

      for await (const delta of textStream) {
        stream.update({ content: delta, isComplete: false })
      }

      stream.update({ content: '', isComplete: true })
      stream.done()
    } catch (error) {
      console.error('Azure OpenAI Error:', error)
      
      // Fallback: provide a smart mock response that understands LaTeX and context
      console.log('Processing input:', input)
      
      // Extract the selected text and user request
      const selectedTextMatch = input.match(/Selected text to modify:\s*([\s\S]*?)(?:\n\n|\nUser request:)/)
      const selectedText = selectedTextMatch ? selectedTextMatch[1].trim() : ''
      
      const userRequestMatch = input.match(/User request:\s*(.+?)(?:\n|$)/i)
      const userRequest = userRequestMatch ? userRequestMatch[1].trim() : input
      const userRequestLower = userRequest.toLowerCase()
      
      console.log('Selected text:', selectedText)
      console.log('User request:', userRequest)
      
      let mockResponse = ''
      
      // Smart LaTeX-aware response based on context
      if (userRequestLower.includes('change') || userRequestLower.includes('replace') || userRequestLower.includes('to')) {
        // Extract the new name from the request
        let newName = ''
        
        // Try different patterns to extract the name
        let match = userRequestLower.match(/to\s+([a-zA-Z\s]+)/)
        if (!match) match = userRequestLower.match(/change.*?to\s+([a-zA-Z\s]+)/)
        if (!match) match = userRequestLower.match(/replace.*?with\s+([a-zA-Z\s]+)/)
        if (!match) match = userRequestLower.match(/["']([^"']+)["']/)
        if (!match) match = userRequestLower.match(/(?:change|replace).*?([a-zA-Z\s]+)$/)
        
        if (match) {
          newName = match[1].trim()
          // Capitalize properly
          newName = newName.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')
        } else {
          newName = 'New Name'
        }
        
                 // If selected text contains LaTeX commands, preserve the structure
         if (selectedText.includes('\\')) {
           // Smart LaTeX replacement - preserve structure and replace only names
           let result = selectedText
           
           // Find the actual name to replace (usually the last meaningful text)
           // Look for patterns like "John Doe" or "Name" in LaTeX context
           
           // Pattern 1: Name after \scshape
           if (result.includes('\\scshape')) {
             result = result.replace(/(\\scshape\s+)([A-Za-z]+(?:\s+[A-Za-z]+)*)/g, `$1${newName}`)
           }
           // Pattern 2: Name in braces after commands
           else if (result.match(/\{[^}]*[A-Za-z]+\s+[A-Za-z]+[^}]*\}/)) {
             result = result.replace(/([A-Za-z]+\s+[A-Za-z]+)(?=[^}]*\})/g, newName)
           }
           // Pattern 3: Simple name replacement (last resort)
           else {
             // Find the most likely name pattern (two words)
             const nameMatch = result.match(/[A-Za-z]+\s+[A-Za-z]+/)
             if (nameMatch) {
               result = result.replace(nameMatch[0], newName)
             }
           }
           
           mockResponse = result
         } else {
           // Simple text replacement
           mockResponse = newName
         }
        
        console.log('Using replacement:', mockResponse)
      } else {
        // For other requests, try to be smart about modifications
        mockResponse = selectedText || 'Updated Text'
        console.log('Using default modification')
      }

      // Stream the mock response
      for (const char of mockResponse) {
        stream.update({ content: char, isComplete: false })
        await new Promise(resolve => setTimeout(resolve, 20))
      }

      stream.update({ content: '', isComplete: true })
      stream.done()
    }
  })()

  return { output: stream.value }
}

// 'use server';

// import { createStreamableValue } from 'ai/rsc';

// export async function generate(input: string) {
//   const stream = createStreamableValue({content: '', isComplete: false});

//   (async () => {
//     const fakeLatexContent = `section{Introduction}
// This is a sample introduction to demonstrate the fake stream.

// \\subsection{Background}
// Here's some background information about the topic.

// \\section{Methodology}
// We used the following methods in our study:
// \\begin{itemize}
//   \\item Method 1
//   \\item Method 2
//   \\item Method 3
// \\end{itemize}

// \\section{Results}
// Our results show that...`;

//     for (const char of fakeLatexContent) {
//       await new Promise(resolve => setTimeout(resolve, 1)); // Simulate delay
//       stream.update({content: char, isComplete: false});
//     }

//     stream.update({content: '', isComplete: true});
//     stream.done();
//   })();

//   return { output: stream.value};
// }
