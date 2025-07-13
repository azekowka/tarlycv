'use client';

import { generate } from '@/app/actions';
import { readStreamableValue } from 'ai/rsc';
import { calculateDiff } from '../utils/calculateDiff';
import { createContentWidget } from '../utils/WidgetCreator';
import { promptModal } from '../utils/promptModal';
import * as monaco from 'monaco-editor';
import type { editor } from 'monaco-editor';

// Client-side LaTeX validation function
function validateLatexOnClient(text: string): { isValid: boolean; errors: string[] } {
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
  
  return { isValid: errors.length === 0, errors };
}

export const useAIAssist = () => {
  const handleAIAssist = (
    editor: editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco,
    setIsStreaming: (isStreaming: boolean) => void
  ) => {
    // Add Ctrl+K command for AI assist
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyK,
      async () => {
        console.log('⌨️ Ctrl+K pressed - AI Assist triggered!');
        const selection = editor.getSelection();
        const model = editor.getModel();
        if (!model || !selection) {
          console.log('❌ No model or selection found');
          return;
        }

        const oldText = model.getValueInRange(selection);
        console.log('📋 Selected text:', oldText.substring(0, 100) + (oldText.length > 100 ? '...' : ''));
        
        const userInput = await promptModal(editor, monacoInstance, selection);
        if (!userInput) {
          console.log('❌ User cancelled or no input provided');
          return;
        }
        
        console.log('💬 User request:', userInput);

        setIsStreaming(true);
        console.log('🔄 Calling generate function...');
        
        try {
          const stream = await generate(
            `Selected text to modify:\n${oldText}\n\nUser request: ${userInput}\n\nPlease provide ONLY the modified version of the selected text.`
          );

          let newText = '';
          console.log('📡 Reading stream response...');
          for await (const delta of readStreamableValue(stream)) {
            if (delta?.content) {
              newText += delta.content;
            }
          }
          
          console.log('✅ AI response complete. New text length:', newText.length);

          if (newText.trim()) {
            // Validate the AI response on the client side
            console.log('🔍 Validating AI response on client...');
            const validation = validateLatexOnClient(newText.trim());
            
            if (!validation.isValid) {
              console.error('❌ CLIENT-SIDE LaTeX VALIDATION FAILED!');
              validation.errors.forEach((error, index) => {
                console.error(`   ${index + 1}. ${error}`);
              });
              
              // Show error message to user
              const errorMessage = `LaTeX validation failed:\n${validation.errors.join('\n')}`;
              console.warn('⚠️ Showing validation error to user');
              
              // Create a simple error notification
              const errorDiv = document.createElement('div');
              errorDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #dc2626;
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 12px;
                z-index: 10000;
                max-width: 400px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              `;
              errorDiv.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 8px;">⚠️ LaTeX Validation Error</div>
                <div style="white-space: pre-line; line-height: 1.4;">${errorMessage}</div>
                <div style="margin-top: 8px; font-size: 11px; opacity: 0.9;">
                  AI response may cause compilation errors. Check console for details.
                </div>
              `;
              
              document.body.appendChild(errorDiv);
              
              // Auto-remove after 10 seconds
              setTimeout(() => {
                if (errorDiv.parentNode) {
                  errorDiv.parentNode.removeChild(errorDiv);
                }
              }, 10000);
              
              // Still show the diff but with warning
              console.log('⚠️ Proceeding with diff creation despite validation errors');
            } else {
              console.log('✅ Client-side LaTeX validation passed!');
            }
            
            console.log('🎨 Creating diff visualization...');
            const { diffText, decorations, currentLine } = calculateDiff(
              oldText,
              newText,
              monacoInstance,
              selection
            );

            const oldDecorations = editor.deltaDecorations([], decorations);
            
            const contentWidget = createContentWidget(
              editor,
              monacoInstance,
              selection,
              oldText,
              newText.trim(),
              currentLine,
              oldDecorations
            );
            
            console.log('🎯 Content widget created and added to editor');
            
            editor.addContentWidget(contentWidget);
          } else {
            console.log('⚠️ AI returned empty response');
          }
        } catch (error) {
          console.error('❌ Error in AI Assist:', error);
          
          // Show error message to user
          const errorDiv = document.createElement('div');
          errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc2626;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          `;
          errorDiv.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px;">❌ AI Assist Error</div>
            <div style="white-space: pre-line; line-height: 1.4;">${error instanceof Error ? error.message : 'Unknown error occurred'}</div>
            <div style="margin-top: 8px; font-size: 11px; opacity: 0.9;">
              Check console for more details.
            </div>
          `;
          
          document.body.appendChild(errorDiv);
          
          // Auto-remove after 8 seconds
          setTimeout(() => {
            if (errorDiv.parentNode) {
              errorDiv.parentNode.removeChild(errorDiv);
            }
          }, 8000);
        } finally {
          setIsStreaming(false);
        }
      }
    );
  };

  return { handleAIAssist };
};
