export interface Resume {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    isPublic?: boolean;
    tags?: string[];
    templateId?: string;
    pdfUrl?: string;
    latexCode?: string;
  }