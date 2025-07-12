'use client';

import { generate } from '@/app/actions';
import { readStreamableValue } from 'ai/rsc';
import { calculateDiff } from '../utils/calculateDiff';
import { createContentWidget } from '../utils/WidgetCreator';
import { promptModal } from '../utils/promptModal';
import * as monaco from 'monaco-editor';
import type { editor } from 'monaco-editor';

export const useAIAssist = () => {
  const handleAIAssist = (
    editor: editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco,
    setIsStreaming: (isStreaming: boolean) => void
  ) => {
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
        const { output } = await generate(
          `Selected text to modify:\n${oldText}\n\nUser request: ${userInput}\n\nPlease provide ONLY the modified version of the selected text.`
        );

        let newText = '';
        console.log('📡 Reading stream response...');
        for await (const delta of readStreamableValue(output)) {
          if (delta?.content) {
            newText += delta.content;
          }
        }
        setIsStreaming(false);
        console.log('✅ AI response complete. New text length:', newText.length);

        if (newText.trim()) {
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
          
          /* This was applying the change before user approval
          editor.executeEdits('ai-assist', [
            {
              range: new monacoInstance.Range(
                selection.startLineNumber,
                1,
                selection.endLineNumber,
                model.getLineMaxColumn(selection.endLineNumber)
              ),
              text: diffText,
            },
          ]);
          */
        }
      }
    );
  };

  return { handleAIAssist };
};
