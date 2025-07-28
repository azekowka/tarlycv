export async function checkPaymentStatus(projectId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/webhook?projectId=${projectId}`);
    if (!response.ok) {
      throw new Error('Failed to check payment status');
    }
    const { isPaid } = await response.json();
    return isPaid;
  } catch (error) {
    console.error('Error checking payment status:', error);
    return false;
  }
}

export async function createCheckoutSession(projectId: string, projectTitle: string): Promise<string | null> {
  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        projectTitle,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }

    const { checkout_url } = await response.json();
    return checkout_url;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return null;
  }
}