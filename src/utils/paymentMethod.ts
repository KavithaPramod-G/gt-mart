import { PaymentMethod } from '@/types';

export function parsePaymentMethod(value: string | null | undefined): PaymentMethod {
  if (value === 'upi' || value === 'razorpay') {
    return value;
  }
  return 'cod';
}
