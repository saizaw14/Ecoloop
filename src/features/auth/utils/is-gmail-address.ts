const gmailAddressPattern = /^[^\s@]+@gmail\.com$/i;

export function isGmailAddress(value: string) {
  return gmailAddressPattern.test(value.trim());
}
