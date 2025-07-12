'use client'
import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import * as monaco from 'monaco-editor'
import { PromptInputBox } from '../ui/prompt-box'

export const promptModal = async (
  editor: monaco.editor.IStandaloneCodeEditor,
  monacoInstance: typeof monaco,
  selection: monaco.Range
): Promise<string | null> => {
  return new Promise((resolve) => {
    const modalContainer = document.createElement('div');
    document.body.appendChild(modalContainer);

    const closeModal = (result: string | null) => {
      root.unmount();
      if (modalContainer.parentNode) {
        modalContainer.parentNode.removeChild(modalContainer);
      }
      resolve(result);
    };

    const ModalWrapper = () => {
      const [isLoading, setIsLoading] = useState(false);

      const handleSend = (message: string) => {
        setIsLoading(true);
        // Simulate async operation if needed, then close
        setTimeout(() => {
          closeModal(message);
        }, 100);
      };
      
      // The new component doesn't have an explicit close button other than the 'X'
      // We'll rely on a wrapper or Dialog state to handle closing.
      // For simplicity, let's assume clicking outside or pressing Esc will be handled
      // by a Dialog component if we were to wrap PromptInputBox.
      // Since the provided component is complex, we will just use its onSend.

      return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
                // close if backdrop is clicked
                if (e.target === e.currentTarget) {
                    closeModal(null);
                }
            }}
        >
            <div className="w-full max-w-[90vw] md:max-w-[600px]">
                <PromptInputBox 
                    onSend={handleSend} 
                    isLoading={isLoading}
                    placeholder="Ask me to improve your resume..."
                />
            </div>
        </div>
      );
    };

    const root = ReactDOM.createRoot(modalContainer);
    root.render(<ModalWrapper />);
  });
};
