import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const template = formData.get('template') as string | null;

    if (!file || !template) {
      return NextResponse.json({ error: 'Missing file or template.' }, { status: 400 });
    }

    // 1. Upload PDF to external service
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    const uploadResponse = await fetch('https://tarlyai.com/api/upload-pdf', {
      method: 'POST',
      body: uploadFormData,
    });
    if (!uploadResponse.ok) {
      console.error('Upload failed:', await uploadResponse.text());
      throw new Error(`External API Error: Upload failed ${uploadResponse.status}`);
    }
    const uploadResult = await uploadResponse.json();
    const pdfUrl = uploadResult.data?.url || uploadResult.url;
    if (!pdfUrl) throw new Error('PDF URL not found in upload response.');

    // 2. Extract data from PDF
    const extractResponse = await fetch('https://tarlyai.com/api/extract-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfUrl }),
    });
    if (!extractResponse.ok) {
      console.error('Extract failed:', await extractResponse.text());
      throw new Error(`External API Error: Extraction failed ${extractResponse.status}`);
    }
    const extractResult = await extractResponse.json();
    const extractedData = extractResult.extractedData;
    if (!extractedData) throw new Error('Extracted data not found in response.');

    // 3. Convert to LaTeX
    const convertResponse = await fetch('https://tarlyai.com/api/convert-latex', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        extractedData: extractedData,
        template: template,
        model: 'gemini-2.0-flash-exp',
        apiProvider: 'google',
        isTailoredResume: false,
        jobTitle: '',
        jobDescription: '',
      }),
    });
    if (!convertResponse.ok) {
      console.error('Convert failed:', await convertResponse.text());
      throw new Error(`External API Error: Conversion failed ${convertResponse.status}`);
    }
    const convertResult = await convertResponse.json();

    // Return final LaTeX code
    return NextResponse.json({
      latexCode: convertResult.formattedLatex,
      extractedText: extractedData?.text || ''
    });

  } catch (error) {
    const err = error as Error;
    console.error('Error in create-resume-from-pdf route:', err.message);
    return NextResponse.json(
      { error: 'An internal server error occurred.', details: err.message },
      { status: 500 }
    );
  }
} 