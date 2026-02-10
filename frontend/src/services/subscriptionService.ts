import { request } from './apiClient';

export interface SubscriptionResponse {
  email: string;
}

export const subscriptionService = {
  async subscribe(email: string) {
    const response = await request<SubscriptionResponse>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to subscribe');
    }

    return response.data;
  },
};
