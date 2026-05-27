import type { MockClassificationResult } from '@/features/scan/services/mock-classification-service';

let latestScanResult: MockClassificationResult | null = null;

export function getLatestScanResult() {
  return latestScanResult;
}

export function setLatestScanResult(result: MockClassificationResult) {
  latestScanResult = result;
}

export function clearLatestScanResult() {
  latestScanResult = null;
}
