export const DEFAULT_USER_DISPLAY_NAME = 'Eco Warrior';

type ResolveUserDisplayNameOptions = {
  candidates: Array<string | null | undefined>;
  email?: string | null;
  fallback?: string;
};

function normalizeCandidate(value?: string | null) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
}

function normalizeEmailPrefix(email?: string | null) {
  const normalizedEmail = normalizeCandidate(email);
  const emailPrefix = normalizedEmail?.split('@')[0]?.trim();
  return emailPrefix ? emailPrefix.toLowerCase() : undefined;
}

function isFallbackCandidate(value: string, fallback: string) {
  return value.toLowerCase() === fallback.toLowerCase();
}

export function isEmailDerivedDisplayName(name?: string | null, email?: string | null) {
  const normalizedName = normalizeCandidate(name)?.toLowerCase();
  const normalizedEmailPrefix = normalizeEmailPrefix(email);

  return Boolean(normalizedName && normalizedEmailPrefix && normalizedName === normalizedEmailPrefix);
}

export function resolveUserDisplayName({
  candidates,
  email,
  fallback = DEFAULT_USER_DISPLAY_NAME,
}: ResolveUserDisplayNameOptions) {
  const normalizedFallback = normalizeCandidate(fallback) || DEFAULT_USER_DISPLAY_NAME;
  const normalizedCandidates = candidates
    .map((candidate) => normalizeCandidate(candidate))
    .filter((candidate): candidate is string => Boolean(candidate));

  const nonFallbackCandidates = normalizedCandidates.filter(
    (candidate) => !isFallbackCandidate(candidate, normalizedFallback)
  );
  const preferredCandidates = nonFallbackCandidates.filter(
    (candidate) => !isEmailDerivedDisplayName(candidate, email)
  );

  return preferredCandidates[0] || nonFallbackCandidates[0] || normalizedCandidates[0] || normalizedFallback;
}
