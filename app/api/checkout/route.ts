import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { projectId, projectTitle } = await request.json();

    if (!projectId || !projectTitle) {
      return NextResponse.json(
        { error: 'Project ID and title are required' },
        { status: 400 }
      );
    }

    const checkoutData = {
      product_id: process.env.POLAR_PRODUCT_ID,
      success_url: process.env.POLAR_SUCCESS_URL,
      metadata: {
        project_id: projectId,
        project_title: projectTitle,
      },
    };

    const response = await fetch('https://api.polar.sh/v1/checkouts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Polar API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    const checkout = await response.json();
    
    return NextResponse.json({ 
      checkout_url: checkout.url,
      checkout_id: checkout.id 
    });
  } catch (error) {
    console.error('Checkout creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}