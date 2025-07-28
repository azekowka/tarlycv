import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Store paid project IDs in memory (in production, use a database)
const paidProjects = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('webhook-signature');
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.POLAR_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const event = JSON.parse(body);
    
    // Handle checkout completed event
    if (event.type === 'checkout.completed') {
      const projectId = event.data.metadata?.project_id;
      
      if (projectId) {
        // Mark project as paid
        paidProjects.add(projectId);
        console.log(`Payment completed for project: ${projectId}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Helper function to check if a project is paid (internal use only)
function isProjectPaid(projectId: string): boolean {
  return paidProjects.has(projectId);
}

// API route to check payment status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  
  if (!projectId) {
    return NextResponse.json(
      { error: 'Project ID is required' },
      { status: 400 }
    );
  }

  return NextResponse.json({ 
    isPaid: isProjectPaid(projectId) 
  });
}