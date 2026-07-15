const emailAddressPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailAddress(value: string) {
  return emailAddressPattern.test(value.trim());
}
