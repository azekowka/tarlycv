'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Upload, FileText, Sparkles, ArrowLeft, Edit3, FileUp } from 'lucide-react';
import { Resume } from '@/types/resume';
import { cn } from '@/lib/utils';

interface CreateResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateResume: (resume: Resume) => void;
}

type CreationFlow = 'selection' | 'manual' | 'upload';
type Template = 'classic' | 'modern' | 'executive';

const templates = [
  {
    id: 'classic' as Template,
    name: 'Classic Professional',
    preview: 'https://res.cloudinary.com/dlthjlibc/image/upload/v1740654640/Screenshot_2025-02-27_160731_dkzmst.png',
  },
  {
    id: 'modern' as Template,
    name: 'Modern Minimalist',
    preview: 'https://res.cloudinary.com/dlthjlibc/image/upload/v1740654640/Screenshot_2025-02-27_160947_fecwfu.png',
  },
  {
    id: 'executive' as Template,
    name: 'Executive Style',
    preview: 'https://res.cloudinary.com/dlthjlibc/image/upload/v1740654640/Screenshot_2025-02-27_161002_yccv8a.png',
  },
];

export function CreateResumeDialog({
  open,
  onOpenChange,
  onCreateResume,
}: CreateResumeDialogProps) {
  const [currentFlow, setCurrentFlow] = useState<CreationFlow>('selection');
  const [selectedTemplate, setSelectedTemplate] = useState<Template>('modern');
  const [resumeTitle, setResumeTitle] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf' || file.size > 5 * 1024 * 1024) {
      setError(file.type !== 'application/pdf' ? 'Please upload a PDF file.' : 'File size must be less than 5MB.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessingStep('Processing your resume...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('template', selectedTemplate);

      const response = await fetch('/api/create-resume-from-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.details || `An error occurred: ${response.statusText}`);
      }

      const result = await response.json();

      const newResume: Resume = {
        id: Date.now().toString(),
        title: resumeTitle || file.name.replace('.pdf', ''),
        content: result.extractedText,
        latexCode: result.latexCode,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user123',
      };

      onCreateResume(newResume);
      handleClose();
    } catch (err: any) {
      console.error('❌ Error processing PDF:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleCreateManual = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newResume: Resume = {
      id: Date.now().toString(),
      title: 'New Manual Resume',
      content: generateLatexCode(selectedTemplate),
      latexCode: generateLatexCode(selectedTemplate),
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'user123',
    };
    onCreateResume(newResume);
    setIsProcessing(false);
    handleClose();
  };

  const handleClose = () => {
    if (isProcessing) return;
    onOpenChange(false);
    setTimeout(() => {
      setCurrentFlow('selection');
      setResumeTitle('');
      setUploadedFile(null);
      setError(null);
    }, 200);
  };

  const handleBack = () => setCurrentFlow('selection');

  const renderSelectionScreen = () => (
          <DialogContent className="max-w-lg">
            <DialogHeader>
        <DialogTitle className="flex items-center space-x-2"><Sparkles className="h-5 w-5 text-primary" /><span>Create New Resume</span></DialogTitle>
        <DialogDescription>Choose how you'd like to start.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
        <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50" onClick={() => setCurrentFlow('manual')}>
          <CardContent className="p-6 flex items-start space-x-4">
            <div className="flex-shrink-0"><div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center"><Edit3 className="h-6 w-6 text-primary" /></div></div>
                    <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">Create Manually & via AI prompts</h3>
              <p className="text-sm text-muted-foreground">Edit from scratch with rich LaTeX editor and AI prompts.</p>
                  </div>
                </CardContent>
              </Card>
        <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50" onClick={() => setCurrentFlow('upload')}>
          <CardContent className="p-6 flex items-start space-x-4">
            <div className="flex-shrink-0"><div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"><Upload className="h-6 w-6 text-blue-600" /></div></div>
                    <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">Upload Existing Resume</h3>
              <p className="text-sm text-muted-foreground">Upload a PDF and let AI convert it to an editable LaTeX CV.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
      <div className="flex justify-end"><Button variant="outline" onClick={handleClose}>Cancel</Button></div>
          </DialogContent>
  );

  const renderManualScreen = () => (
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={handleBack} className="p-1 h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
              <div>
            <DialogTitle className="flex items-center space-x-2"><Edit3 className="h-5 w-5 text-primary" /><span>Create Resume Manually</span></DialogTitle>
            <DialogDescription>Choose a template to get started</DialogDescription>
              </div>
            </div>
          </DialogHeader>
      <div className="space-y-6 pt-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Choose Template</Label>
              <div className="grid grid-cols-3 gap-4">
                {templates.map((template) => (
              <Card key={template.id} className={cn("cursor-pointer transition-all hover:shadow-md", selectedTemplate === template.id && "ring-2 ring-primary")} onClick={() => setSelectedTemplate(template.id)}>
                    <CardContent className="p-3">
                  <div className="aspect-[3/4] bg-muted rounded-md mb-3 overflow-hidden"><img src={template.preview} alt={template.name} className="w-full h-full object-cover"/></div>
                      <p className="text-sm font-medium text-center">{template.name}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleBack}>Back</Button>
          <Button onClick={handleCreateManual} disabled={isProcessing} className="min-w-[120px]">{isProcessing ? 'Creating...' : 'Create Resume'}</Button>
            </div>
          </div>
        </DialogContent>
    );

  const renderUploadScreen = () => (
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={handleBack} className="p-1 h-8 w-8" disabled={isProcessing}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
            <DialogTitle className="flex items-center space-x-2"><Upload className="h-5 w-5 text-blue-600" /><span>Upload Resume</span></DialogTitle>
            <DialogDescription>Convert your PDF to an editable LaTeX CV</DialogDescription>
            </div>
          </div>
        </DialogHeader>
      <div className="space-y-6 pt-4">
          <div className="space-y-3">
          <Label className="text-sm font-medium">1. Choose Template</Label>
            <div className="grid grid-cols-3 gap-4">
              {templates.map((template) => (
              <Card key={template.id} className={cn("cursor-pointer transition-all hover:shadow-md", selectedTemplate === template.id && "ring-2 ring-primary", isProcessing && "pointer-events-none opacity-60")} onClick={() => !isProcessing && setSelectedTemplate(template.id)}>
                  <CardContent className="p-3">
                  <div className="aspect-[3/4] bg-muted rounded-md mb-3 overflow-hidden"><img src={template.preview} alt={template.name} className="w-full h-full object-cover"/></div>
                    <p className="text-sm font-medium text-center">{template.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
                  <div className="space-y-2">
            <Label htmlFor="resumeTitle">2. Resume Title (Optional)</Label>
            <Input id="resumeTitle" value={resumeTitle} onChange={(e) => setResumeTitle(e.target.value)} placeholder="e.g., Senior Software Engineer Resume" disabled={isProcessing}/>
          </div>
              <div className="space-y-2">
            <Label>3. Upload PDF</Label>
            <div onDragOver={handleDrag} onDragEnter={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}>
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf" onChange={handleFileInputChange}/>
              <EmptyState
                title={uploadedFile ? "File Selected" : "Upload PDF resume"}
                description={uploadedFile ? uploadedFile.name : 'drag & drop or click "Select"'}
                icons={[FileUp, FileText, Upload]}
                action={{ label: uploadedFile ? "Change PDF" : "Select PDF", onClick: () => fileInputRef.current?.click() }}
                className={cn(dragActive && "border-primary bg-primary/5", isProcessing && "opacity-50 pointer-events-none", uploadedFile && "border-green-500 bg-green-500/5")}/>
            </div>
          </div>
          {error && <div className="text-sm text-destructive p-3 bg-destructive/10 rounded-md">{error}</div>}
            {isProcessing && (
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>{processingStep || 'Processing...'}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleBack} disabled={isProcessing}>Back</Button>
          <Button onClick={() => uploadedFile ? handleFileUpload(uploadedFile) : setError('Please select a PDF file.')} disabled={isProcessing || !uploadedFile} className="min-w-[120px]">
            {isProcessing ? (processingStep || 'Processing...') : 'Create Resume'}
            </Button>
          </div>
        </div>
      </DialogContent>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {currentFlow === 'selection' && renderSelectionScreen()}
      {currentFlow === 'manual' && renderManualScreen()}
      {currentFlow === 'upload' && renderUploadScreen()}
      <AlertDialog open={!!error && currentFlow === 'selection'} onOpenChange={() => setError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Error</AlertDialogTitle><AlertDialogDescription>{error}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogAction onClick={() => setError(null)}>OK</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

function generateLatexCode(template: Template): string {
  return `
\\documentclass{article}
\\begin{document}
\\section*{New Resume}
This is a new resume created with the ${template} template.
\\end{document}
  `.trim();
} 