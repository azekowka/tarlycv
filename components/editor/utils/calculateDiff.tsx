'use client'
import * as monaco from 'monaco-editor'
import { updateDiffData } from '../hooks/useHoverProvider'

export const calculateDiff = (
  oldText: string,
  newText: string,
  monacoInstance: typeof monaco,
  selection: monaco.Selection
) => {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')

  let decorations: monaco.editor.IModelDeltaDecoration[] = []
  let currentLine = selection.startLineNumber

  // Создаем Map для хранения diff данных для hover provider
  const diffDataMap = new Map<string, { oldText: string; newText: string; type: 'delete' | 'add' | 'change' }>()

  // Простой построчный diff
  const maxLines = Math.max(oldLines.length, newLines.length)
  
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i] || ''
    const newLine = newLines[i] || ''
    
    if (oldLine !== newLine) {
      // Если есть старая строка - помечаем её как удаляемую (красный фон)
      if (oldLine && i < oldLines.length) {
        const decorationRange = new monacoInstance.Range(currentLine, 1, currentLine, 1)
        
        decorations.push({
          range: decorationRange,
          options: { 
            isWholeLine: true,
            className: 'diff-old-content',
            hoverMessage: { value: `Удалить: "${oldLine}"` }
          },
        })
        
        // Сохраняем данные для hover provider
        const key = `${currentLine}-1-${decorationRange.endColumn}`
        diffDataMap.set(key, {
          oldText: oldLine,
          newText: newLine,
          type: 'delete'
        })
      }
      
      // Если есть новая строка - помечаем её как добавляемую (зеленый фон)
      if (newLine && i < newLines.length) {
        const decorationRange = new monacoInstance.Range(currentLine + 1, 1, currentLine + 1, 1)
        
      decorations.push({
          range: decorationRange,
          options: { 
            isWholeLine: true,
            className: 'diff-new-content',
            hoverMessage: { value: `Добавить: "${newLine}"` }
          },
        })
        
        // Сохраняем данные для hover provider
        const key = `${currentLine + 1}-1-${decorationRange.endColumn}`
        diffDataMap.set(key, {
          oldText: oldLine,
          newText: newLine,
          type: 'add'
        })
      }
    }
      currentLine++
    }

  // Если это единственная строка/фрагмент, показываем проще
  if (oldLines.length === 1 && newLines.length === 1) {
    decorations = []
    
    // Подсвечиваем именно выделенный диапазон как изменяемый
    const decorationRange = new monacoInstance.Range(
      selection.startLineNumber,
      selection.startColumn,
      selection.endLineNumber,
      selection.endColumn
    )
    
    decorations.push({
      range: decorationRange,
      options: { 
        className: 'diff-old-content',
        hoverMessage: { value: `Изменить "${oldText}" → "${newText}"` }
      },
    })
    
    // Сохраняем данные для hover provider
    const key = `${selection.startLineNumber}-${selection.startColumn}-${selection.endColumn}`
    diffDataMap.set(key, {
      oldText: oldText,
      newText: newText,
      type: 'change'
    })
  }

  // Обновляем глобальные diff данные для hover provider
  updateDiffData(diffDataMap)

  return { 
    diffText: newText, 
    decorations, 
    currentLine: selection.endLineNumber + 1
  }
}
