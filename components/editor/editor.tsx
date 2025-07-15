import React from 'react'
import Editor from '@monaco-editor/react'
import { useEditorSetup } from './hooks/useEditorSetup'
import { useAIAssist } from './hooks/useAIAssist'
import { useHoverProvider } from './hooks/useHoverProvider'
import { editorDefaultOptions } from './constants/editorDefaults'

interface CodeEditorProps {
  onChange: (value: string) => void
  value: string
  setIsStreaming: (isStreaming: boolean) => void
}

const EditorLoading = () => null

export const CodeEditor = ({ onChange, value, setIsStreaming }: CodeEditorProps) => {
  const { editorRef, handleEditorDidMount } = useEditorSetup(onChange, value)
  const { handleAIAssist } = useAIAssist()
  const { registerHoverProvider } = useHoverProvider()

  return (
    <Editor
      theme="vs-dark"
      language="latex"
      height="100%"
      width="100%"
      value={value}
      className="pt-2 bg-background"
      onMount={(editor, monaco) => {
        handleEditorDidMount(editor, monaco)
        handleAIAssist(editor, monaco, setIsStreaming)
        // Регистрируем hover provider для diff подсказок
        registerHoverProvider(editor, monaco)
      }}
      options={editorDefaultOptions}
      loading={<EditorLoading />}
    />
  )
}
