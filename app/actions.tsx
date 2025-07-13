'use server';

import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createStreamableValue } from 'ai/rsc';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

// Enhanced LaTeX validation function
function validateLatexStructure(text: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check brace balance
  const braceCount = (text.match(/\{/g) || []).length - (text.match(/\}/g) || []).length;
  if (braceCount !== 0) {
    errors.push(`Unbalanced braces: ${braceCount > 0 ? 'missing closing' : 'missing opening'} braces`);
  }
  
  // Check for incomplete commands (trailing backslashes that aren't line breaks)
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.endsWith('\\') && !line.endsWith('\\\\')) {
      errors.push(`Incomplete LaTeX command on line ${i + 1}: trailing backslash`);
    }
  }
  
  // Check for unmatched resume list commands
  const listStartCount = (text.match(/\\resumeSubHeadingListStart/g) || []).length;
  const listEndCount = (text.match(/\\resumeSubHeadingListEnd/g) || []).length;
  if (listStartCount !== listEndCount) {
    errors.push(`Unmatched resume list commands: ${listStartCount} starts, ${listEndCount} ends`);
  }
  
  const itemListStartCount = (text.match(/\\resumeItemListStart/g) || []).length;
  const itemListEndCount = (text.match(/\\resumeItemListEnd/g) || []).length;
  if (itemListStartCount !== itemListEndCount) {
    errors.push(`Unmatched item list commands: ${itemListStartCount} starts, ${itemListEndCount} ends`);
  }
  
  // Check for truly broken LaTeX commands (more specific)
  // Valid LaTeX commands: \word, \\, \{, \}, \%, \$, \&, \#, \_, etc.
  const validCommands = [
    '\\\\', // line break
    '\\{', '\\}', // escaped braces
    '\\%', '\\$', '\\&', '\\#', '\\_', // escaped special chars
    '\\~', '\\^', // spacing commands
    '\\,', '\\;', '\\:', '\\!', // spacing commands
    '\\ ', // escaped space
  ];
  
  // Look for backslashes followed by invalid characters
  const potentiallyBrokenCommands = text.match(/\\[^a-zA-Z\s\\{}%$&#_~^,:! ]/g);
  if (potentiallyBrokenCommands) {
    const actuallyBroken = potentiallyBrokenCommands.filter(cmd => 
      !validCommands.includes(cmd) && 
      !cmd.match(/\\[a-zA-Z]+/) // not a valid command name
    );
    if (actuallyBroken.length > 0) {
      errors.push(`Potentially broken LaTeX commands: ${actuallyBroken.join(', ')}`);
    }
  }
  
  // Check for unescaped special characters (but be more lenient)
  const problematicPatterns = [
    { pattern: /(?<!\\)%/g, name: 'unescaped %' },
    { pattern: /(?<!\\)\$(?!\$)/g, name: 'unescaped $ (not in math mode)' },
    { pattern: /(?<!\\)&(?!.*\\\\)/g, name: 'unescaped & (not in table)' },
    { pattern: /(?<!\\)#(?!\d)/g, name: 'unescaped # (not parameter)' },
    { pattern: /(?<!\\)_(?![a-zA-Z])/g, name: 'unescaped _ (not in command)' },
  ];
  
  for (const { pattern, name } of problematicPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      errors.push(`${name}: found ${matches.length} instance(s)`);
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

// Function to automatically fix common LaTeX structural issues
function autoFixLatexStructure(text: string): string {
  let fixedText = text;
  
  // Fix 1: Missing Experience section before \resumeSubheading
  // Check if there's a \resumeSubheading without a preceding \section{Experience} and \resumeSubHeadingListStart
  const hasResumeSubheading = fixedText.includes('\\resumeSubheading');
  const hasExperienceSection = fixedText.includes('\\section{Experience}');
  const hasResumeSubHeadingListStart = fixedText.includes('\\resumeSubHeadingListStart');
  
  if (hasResumeSubheading && !hasExperienceSection && !hasResumeSubHeadingListStart) {
    console.log('🔧 Auto-fixing: Adding missing Experience section and resumeSubHeadingListStart');
    
    // Find the first \resumeSubheading and insert the Experience section before it
    const resumeSubheadingMatch = fixedText.match(/\\resumeSubheading/);
    if (resumeSubheadingMatch) {
      const insertIndex = resumeSubheadingMatch.index!;
      const beforeSubheading = fixedText.substring(0, insertIndex);
      const afterSubheading = fixedText.substring(insertIndex);
      
      fixedText = beforeSubheading + 
        '\\section{Experience}\n  \\resumeSubHeadingListStart\n  \n' +
        afterSubheading;
    }
  }
  
  // Fix 2: Add missing \end{center} if needed
  const hasCenterStart = fixedText.includes('\\begin{center}');
  const hasCenterEnd = fixedText.includes('\\end{center}');
  
  if (hasCenterStart && !hasCenterEnd) {
    console.log('🔧 Auto-fixing: Adding missing \\end{center}');
    // Find where to insert \end{center} - usually after contact info and before first section
    const sectionMatch = fixedText.match(/\\section\{/);
    if (sectionMatch) {
      const insertIndex = sectionMatch.index!;
      const beforeSection = fixedText.substring(0, insertIndex);
      const afterSection = fixedText.substring(insertIndex);
      
      fixedText = beforeSection + '\\end{center}\n\n' + afterSection;
    }
  }
  
  // Fix 3: Ensure proper list structure balance
  let listStartCount = (fixedText.match(/\\resumeSubHeadingListStart/g) || []).length;
  let listEndCount = (fixedText.match(/\\resumeSubHeadingListEnd/g) || []).length;
  
  if (listStartCount < listEndCount) {
    console.log('🔧 Auto-fixing: Adding missing resumeSubHeadingListStart commands');
    // Add missing start commands before the first \resumeSubheading in each section
    const sections = fixedText.split(/\\section\{[^}]+\}/);
    let fixedSections = [];
    
    for (let i = 0; i < sections.length; i++) {
      let section = sections[i];
      if (i > 0) { // Skip the preamble
        const hasSubheading = section.includes('\\resumeSubheading') || section.includes('\\resumeProjectHeading');
        const hasListStart = section.includes('\\resumeSubHeadingListStart');
        
        if (hasSubheading && !hasListStart) {
          // Insert \resumeSubHeadingListStart at the beginning of the section content
          section = '\n  \\resumeSubHeadingListStart\n' + section;
        }
      }
      fixedSections.push(section);
    }
    
    // Reconstruct the document
    const sectionTitles = fixedText.match(/\\section\{[^}]+\}/g) || [];
    let reconstructed = fixedSections[0]; // preamble
    
    for (let i = 1; i < fixedSections.length && i - 1 < sectionTitles.length; i++) {
      reconstructed += sectionTitles[i - 1] + fixedSections[i];
    }
    
    fixedText = reconstructed;
  }
  
  return fixedText;
}

export async function generate(input: string) {
  console.log('🤖 GEMINI API CALL INITIATED');
  console.log('📝 Input received:', input.substring(0, 100) + '...');
  
  // Pre-validate input to catch potential issues
  const selectedTextMatch = input.match(
    /Selected text to modify:\s*([\s\S]*?)(?:\n\n|\nUser request:)/
  );
  const selectedText = selectedTextMatch ? selectedTextMatch[1].trim() : '';
  
  if (selectedText) {
    console.log('🔍 Pre-validating selected text...');
    const inputValidation = validateLatexStructure(selectedText);
    if (!inputValidation.isValid) {
      console.warn('⚠️ WARNING: Selected text has LaTeX issues:');
      inputValidation.errors.forEach((error, index) => {
        console.warn(`   ${index + 1}. ${error}`);
      });
    }
  }
  
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
        model: google('gemini-1.5-pro-latest') as any,
      system:
          'You are a professional resume writing expert and LaTeX specialist. When given selected text from a resume and a modification request, return ONLY the improved/modified text that should replace the selection.\n\n' +
          
          '🚨 CRITICAL LaTeX STRUCTURE RULES - VIOLATION WILL CAUSE COMPILATION FAILURE:\n\n' +
          
          '1. NEVER MODIFY LIST STRUCTURE:\n' +
          '   - If you see \\resumeSubHeadingListStart, DO NOT add or remove it\n' +
          '   - If you see \\resumeSubHeadingListEnd, DO NOT add or remove it\n' +
          '   - If you see \\resumeItemListStart, DO NOT add or remove it\n' +
          '   - If you see \\resumeItemListEnd, DO NOT add or remove it\n' +
          '   - These commands MUST remain exactly as they are in the input\n\n' +
          
          '2. PRESERVE EXACT COMMAND STRUCTURE:\n' +
          '   - \\resumeSubheading{...}{...}{...}{...} - keep all 4 parameters\n' +
          '   - \\resumeItem{...} - keep single parameter structure\n' +
          '   - \\resumeProjectHeading{...}{...} - keep dual parameter structure\n' +
          '   - All LaTeX commands must be complete and properly closed\n\n' +
          
          '3. BRACE MATCHING RULES:\n' +
          '   - Every opening { must have a closing }\n' +
          '   - Count braces carefully: {text} = 1 open, 1 close\n' +
          '   - Nested braces: {text {nested} text} = 2 open, 2 close\n' +
          '   - NEVER leave unmatched braces\n\n' +
          
          '4. SPECIAL CHARACTER HANDLING:\n' +
          '   - Use \\& for ampersands, \\% for percentages, \\$ for dollars\n' +
          '   - Use \\textbf{...} for bold text, \\textit{...} for italic\n' +
          '   - Use \\href{url}{text} for links\n' +
          '   - Use \\\\ for line breaks (double backslash), \\vspace{...} for spacing\n' +
          '   - IMPORTANT: \\\\ is VALID and REQUIRED for line breaks in LaTeX\n\n' +
          
          '5. PROHIBITED ACTIONS:\n' +
          '   - DO NOT add trailing backslashes (\\)\n' +
          '   - DO NOT create incomplete commands\n' +
          '   - DO NOT modify the overall document structure\n' +
          '   - DO NOT add or remove section headers unless specifically requested\n' +
          '   - DO NOT change command names or parameters\n\n' +
          
          'CONTENT IMPROVEMENT GUIDELINES:\n' +
          '- Use strong action verbs (achieved, developed, implemented, led, optimized, etc.)\n' +
          '- Quantify achievements with numbers, percentages, or metrics when possible\n' +
          '- Write in professional, concise language avoiding personal pronouns\n' +
          '- Use industry-appropriate terminology and keywords\n' +
          '- Focus on accomplishments and impact rather than just duties\n' +
          '- Ensure consistency in tense and formatting\n' +
          '- When updating contact information, replace ALL relevant fields with the requested information\n' +
          '- For social media updates, update URLs, usernames, and display text to match the new person\n\n' +
          
          'EXAMPLE OF CORRECT MODIFICATION:\n' +
          'INPUT: \\resumeItem{Did some work on a project}\n' +
          'OUTPUT: \\resumeItem{Spearheaded cross-functional development of enterprise-level project, resulting in 25\\% performance improvement}\n\n' +
          
          'EXAMPLE OF INCORRECT MODIFICATION (WILL BREAK COMPILATION):\n' +
          'INPUT: \\resumeItem{Did some work on a project}\n' +
          'OUTPUT: \\resumeItem{Spearheaded cross-functional development of enterprise-level project, resulting in 25% performance improvement\n' +
          '(Missing closing brace and unescaped % character)\n\n' +
          
          'Return ONLY the modified text without explanations, comments, or code blocks. The output must be valid LaTeX that compiles without errors.',
      prompt: input,
      });

      console.log('✅ Gemini API responded successfully, streaming text...');

      let totalTokens = 0;
      let fullResponse = '';
    for await (const delta of textStream) {
        totalTokens++;
        fullResponse += delta;
        console.log('📨 Received delta:', delta.substring(0, 50) + (delta.length > 50 ? '...' : ''));
        stream.update({ content: delta, isComplete: false });
      }

      console.log('🏁 Streaming completed! Total tokens received:', totalTokens);
      
      // Auto-fix common LaTeX structural issues
      console.log('🔧 Attempting to auto-fix LaTeX structure...');
      const autoFixedResponse = autoFixLatexStructure(fullResponse);
      
      if (autoFixedResponse !== fullResponse) {
        console.log('✅ Auto-fixes applied to LaTeX structure');
        fullResponse = autoFixedResponse;
      } else {
        console.log('ℹ️ No auto-fixes needed');
      }
      
      // Enhanced LaTeX validation
      console.log('🔍 Validating LaTeX structure...');
      const validation = validateLatexStructure(fullResponse);
      
      if (!validation.isValid) {
        console.error('❌ LaTeX VALIDATION FAILED!');
        validation.errors.forEach((error, index) => {
          console.error(`   ${index + 1}. ${error}`);
        });
        console.warn('⚠️ This response may cause compilation errors!');
        console.log('📄 Full response for debugging:');
        console.log(fullResponse);
      } else {
        console.log('✅ LaTeX validation passed!');
      }
      
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

  return stream.value;
}

// Server action to fix LaTeX document structure
export async function fixLatexDocumentFromError(
  originalContent: string,
  compilationError: string
): Promise<{ fixedContent: string; wasFixed: boolean; explanation: string }> {
  'use server';
  
  console.log('🔧 FIXING LATEX DOCUMENT FROM COMPILATION ERROR');
  console.log('📝 Original content length:', originalContent.length);
  console.log('❌ Compilation error:', compilationError.substring(0, 500) + '...');
  
  try {
    // Enhanced prompt for AI to fix LaTeX based on compilation error
    const prompt = `You are a LaTeX expert. I have a LaTeX document that failed to compile with the following error:

COMPILATION ERROR:
${compilationError}

ORIGINAL LATEX DOCUMENT:
${originalContent}

Please analyze the error and provide a FIXED version of the COMPLETE LaTeX document. The fix should:

1. Address the specific compilation error mentioned above
2. Maintain the original content and structure as much as possible
3. Only make minimal changes necessary to fix the compilation issue
4. Ensure all LaTeX commands are properly formatted and balanced
5. Keep the document's intended formatting and content intact

CRITICAL RULES:
- Return ONLY the corrected LaTeX code, no explanations or markdown
- Do not add any text before or after the LaTeX code
- Ensure all braces, environments, and commands are properly balanced
- Fix unescaped special characters if needed
- Maintain the original document structure

FIXED LATEX DOCUMENT:`;

    console.log('🚀 Calling Gemini API for LaTeX error fix...');
    
    const result = await streamText({
      model: google('gemini-1.5-pro-latest') as any,
      prompt: prompt,
      maxTokens: 4000,
    });
    
    let fixedContent = '';
    for await (const textPart of result.textStream) {
      fixedContent += textPart;
    }
    
    if (!fixedContent || fixedContent.trim() === '') {
      console.log('❌ AI returned empty fixed content');
      return {
        fixedContent: originalContent,
        wasFixed: false,
        explanation: 'AI could not generate a fix'
      };
    }
    
    // Check if content was actually changed
    const wasFixed = fixedContent.trim() !== originalContent.trim();
    
    console.log('📊 Fix results:');
    console.log('   Original length:', originalContent.length);
    console.log('   Fixed length:', fixedContent.length);
    console.log('   Was fixed:', wasFixed);
    
    return {
      fixedContent: fixedContent.trim(),
      wasFixed,
      explanation: wasFixed ? 'Document was automatically fixed by AI' : 'No changes were needed'
    };
    
  } catch (error) {
    console.error('❌ Error in fixLatexDocumentFromError:', error);
    
    return {
      fixedContent: originalContent,
      wasFixed: false,
      explanation: `Error during fix: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
