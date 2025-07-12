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
        const selection = editor.getSelection();
        const model = editor.getModel();
        if (!model || !selection) return;

        const oldText = model.getValueInRange(selection);
        const userInput = await promptModal(editor, monacoInstance, selection);
        if (!userInput) return;

        setIsStreaming(true);
        const { output } = await generate(
          `Selected text to modify:\n${oldText}\n\nUser request: ${userInput}\n\nPlease provide ONLY the modified version of the selected text.`
        );

        let newText = '';
        for await (const delta of readStreamableValue(output)) {
          if (delta?.content) {
            newText += delta.content;
          }
        }
        setIsStreaming(false);

        if (newText.trim()) {
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
          
          editor.addContentWidget(contentWidget);
          
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
        }
      }
    );
  };

  return { handleAIAssist };
};
