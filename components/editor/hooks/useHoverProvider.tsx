'use client';

import * as monaco from 'monaco-editor';
import type { editor } from 'monaco-editor';

// Глобальное хранилище diff данных для hover provider
let currentDiffData: Map<string, { oldText: string; newText: string; type: 'delete' | 'add' | 'change' }> = new Map();

// Функция для обновления diff данных
export const updateDiffData = (diffData: Map<string, { oldText: string; newText: string; type: 'delete' | 'add' | 'change' }>) => {
  currentDiffData = diffData;
};

// Функция для очистки diff данных
export const clearDiffData = () => {
  currentDiffData.clear();
};

export const useHoverProvider = () => {
  const registerHoverProvider = (
    editor: editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco
  ) => {
    // Регистрируем hover provider для языка latex
    const hoverProvider = monacoInstance.languages.registerHoverProvider('latex', {
      provideHover: (model, position) => {
        try {
          // Получаем декорации в текущей позиции
          const decorations = model.getDecorationsInRange({
            startLineNumber: position.lineNumber,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: model.getLineMaxColumn(position.lineNumber)
          });

          // Ищем декорации diff
          for (const decoration of decorations) {
            const className = decoration.options.className;
            
            if (className === 'diff-old-content' || className === 'diff-new-content') {
              // Создаем ключ для поиска в diff данных
              const lineNumber = decoration.range.startLineNumber;
              const key = `${lineNumber}-${decoration.range.startColumn}-${decoration.range.endColumn}`;
              
              // Ищем данные о diff для этой позиции
              let diffInfo = currentDiffData.get(key);
              
              // Если точного совпадения нет, ищем по номеру строки
              if (!diffInfo) {
                for (const [dataKey, data] of currentDiffData.entries()) {
                  if (dataKey.startsWith(`${lineNumber}-`)) {
                    diffInfo = data;
                    break;
                  }
                }
              }

              if (diffInfo) {
                let hoverText = '';
                
                if (diffInfo.type === 'delete') {
                  hoverText = `**Удалить:** \`${diffInfo.oldText}\``;
                } else if (diffInfo.type === 'add') {
                  hoverText = `**Добавить:** \`${diffInfo.newText}\``;
                } else if (diffInfo.type === 'change') {
                  hoverText = `**Изменить:**\n\n**Удалить:** \`${diffInfo.oldText}\`\n\n**Добавить:** \`${diffInfo.newText}\``;
                }

                return {
                  range: decoration.range,
                  contents: [
                    {
                      value: hoverText,
                      isTrusted: true
                    }
                  ]
                };
              }
            }
          }

          return null;
        } catch (error) {
          console.error('Hover provider error:', error);
          return null;
        }
      }
    });

    return hoverProvider;
  };

  return { registerHoverProvider };
}; 