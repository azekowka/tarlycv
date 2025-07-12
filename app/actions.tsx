'use server';

import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createStreamableValue } from 'ai/rsc';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function generate(input: string) {
  console.log('🤖 GEMINI API CALL INITIATED');
  console.log('📝 Input received:', input.substring(0, 100) + '...');
  
  const stream = createStreamableValue({ content: '', isComplete: false });

  (async () => {
    // Check if Gemini API is properly configured
    const isConfigured = !!process.env.GEMINI_API_KEY;
    
    console.log('🔑 API Key configured:', isConfigured);
    console.log('🔧 Environment check - GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

    if (!isConfigured) {
      console.log('❌ Gemini API not configured. Missing environment variable:');
      console.log('- GEMINI_API_KEY:', isConfigured);

      // Return original text to avoid corruption
      const selectedTextMatch = input.match(
        /Selected text to modify:\s*([\s\S]*?)(?:\n\n|\nUser request:)/
      );
      const selectedText = selectedTextMatch ? selectedTextMatch[1].trim() : '';

      const fallbackResponse =
        selectedText || 'Please configure the Gemini API key.';

      for (const char of fallbackResponse) {
        stream.update({ content: char, isComplete: false });
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      stream.update({ content: '', isComplete: true });
      stream.done();
      return;
    }

    try {
      console.log('🚀 Calling Gemini API with model: gemini-1.5-pro-latest');
      console.log('📊 Starting text stream...');
      
      const { textStream } = await streamText({
        model: google('models/gemini-1.5-pro-latest') as any,
        system:
          'You are a professional resume writing expert and LaTeX specialist. When given selected text from a resume and a modification request, return ONLY the improved/modified text that should replace the selection. Follow these guidelines:\n\n' +
          '1. Use strong action verbs (achieved, developed, implemented, led, optimized, etc.)\n' +
          '2. Quantify achievements with numbers, percentages, or metrics when possible\n' +
          '3. Write in professional, concise language avoiding personal pronouns\n' +
          '4. Maintain proper LaTeX formatting and structure\n' +
          '5. Use industry-appropriate terminology and keywords\n' +
          '6. Focus on accomplishments and impact rather than just duties\n' +
          '7. Ensure consistency in tense and formatting\n' +
          '8. Preserve LaTeX commands and structure exactly\n' +
          '9. When updating contact information (name, email, phone, social media), replace ALL relevant fields with the requested information\n' +
          '10. For social media updates, update URLs, usernames, and display text to match the new person\n' +
          '11. Maintain proper LaTeX syntax - avoid trailing backslashes and ensure all commands are properly closed\n\n' +
          'Return ONLY the modified text without explanations, comments, or code blocks.',
        prompt: input,
      });
      
      console.log('✅ Gemini API responded successfully, streaming text...');

      let totalTokens = 0;
      for await (const delta of textStream) {
        totalTokens++;
        console.log('📨 Received delta:', delta.substring(0, 50) + (delta.length > 50 ? '...' : ''));
        stream.update({ content: delta, isComplete: false });
      }

      console.log('🏁 Streaming completed! Total tokens received:', totalTokens);
      stream.update({ content: '', isComplete: true });
      stream.done();
    } catch (error) {
      console.log('❌ GEMINI API ERROR OCCURRED');
      const errorDetails =
        error instanceof Error
          ? {
              error: error.message,
              stack: error.stack,
            }
          : {
              error: 'Unknown error',
              stack: 'No stack trace available',
            };

      console.error('🚨 Gemini API Error Details:', errorDetails);
      console.log('🔍 Error type:', typeof error);
      console.log('🔍 Error name:', error instanceof Error ? error.name : 'Unknown');

      // Return original text to avoid corruption
      const selectedTextMatch = input.match(
        /Selected text to modify:\s*([\s\S]*?)(?:\n\n|\nUser request:)/
      );
      const selectedText = selectedTextMatch ? selectedTextMatch[1].trim() : '';

      const fallbackResponse =
        selectedText || 'Gemini API error - check console for details.';

      for (const char of fallbackResponse) {
        stream.update({ content: char, isComplete: false });
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      stream.update({ content: '', isComplete: true });
      stream.done();
    }
  })();

  return { output: stream.value };
}
