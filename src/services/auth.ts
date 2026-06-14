import {
  DEV_MOCK_OTP,
  MIN_PHONE_LENGTH,
  PHONE_COUNTRY_CODE,
} from '@/constants/config';

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');

  if (digits.length === MIN_PHONE_LENGTH) {
    return `${PHONE_COUNTRY_CODE}${digits}`;
  }

  if (digits.startsWith(PHONE_COUNTRY_CODE) && digits.length === MIN_PHONE_LENGTH + 2) {
    return digits;
  }

  return digits;
}

export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const local =
    digits.startsWith(PHONE_COUNTRY_CODE) && digits.length > MIN_PHONE_LENGTH
      ? digits.slice(PHONE_COUNTRY_CODE.length)
      : digits;

  if (local.length === MIN_PHONE_LENGTH) {
    return `+${PHONE_COUNTRY_CODE} ${local.slice(0, 5)} ${local.slice(5)}`;
  }

  return phone;
}

export function isValidIndianMobile(input: string): boolean {
  const digits = input.replace(/\D/g, '');

  if (digits.length === MIN_PHONE_LENGTH) {
    return /^[6-9]\d{9}$/.test(digits);
  }

  if (digits.length === MIN_PHONE_LENGTH + 2 && digits.startsWith(PHONE_COUNTRY_CODE)) {
    return /^[6-9]\d{9}$/.test(digits.slice(PHONE_COUNTRY_CODE.length));
  }

  return false;
}

export async function sendOtpMock(phone: string): Promise<{ success: boolean; message: string }> {
  if (!isValidIndianMobile(phone)) {
    return { success: false, message: 'Enter a valid 10-digit mobile number.' };
  }

  return {
    success: true,
    message: `OTP sent to ${formatPhoneDisplay(normalizePhone(phone))}. Dev OTP: ${DEV_MOCK_OTP}`,
  };
}

export function verifyOtpMock(otp: string): boolean {
  return otp.trim() === DEV_MOCK_OTP;
}
