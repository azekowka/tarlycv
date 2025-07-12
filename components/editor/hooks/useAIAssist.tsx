'use client'
import { useState } from 'react'
import { generate } from '@/app/actions'
import { readStreamableValue } from 'ai/rsc'
import { calculateDiff } from '../utils/calculateDiff'
import { createContentWidget } from '../utils/WidgetCreator'
import { promptModal } from '../utils/promptModal'
import { applyEdit } from '../utils/applyEdit'
import * as monaco from 'monaco-editor'
import type { editor } from 'monaco-editor'

export const useAIAssist = () => {
  const handleAIAssist = (editor: editor.IStandaloneCodeEditor, monacoInstance: typeof monaco, setIsStreaming: (isStreaming: boolean) => void) => {
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyK, async () => {
      const selection = editor.getSelection()
      const model = editor.getModel()
      if (!model || !selection) return
      const initialText = model.getValue()
      const range = new monaco.Range(
        selection.startLineNumber,
        selection.startColumn,
        selection.endLineNumber,
        selection.endColumn
      )

      const oldText = model.getValueInRange(range)
      const userInput = await promptModal(editor, monacoInstance, selection)

      // Only send the selected text as context, not the entire file
      const { output } = await generate(
        `Selected text to modify:\n${oldText}\n\nUser request: ${userInput}\n\nPlease provide ONLY the modified version of the selected text. Do not include any other parts of the document.`
      )

      let newText = ''
      setIsStreaming(true)

      // Collect all streamed content first, don't apply edits during streaming
      for await (const delta of readStreamableValue(output)) {
        if (!delta) continue
        newText += delta.content
      }

      setIsStreaming(false)
      
      // Only apply the edit once when streaming is complete
      if (newText.trim()) {
        model.pushEditOperations(
          [],
          [
            {
              range: range,
              text: newText.trim(),
            },
          ],
          () => null
        )
      }
    })
  }

  return { handleAIAssist }
}
