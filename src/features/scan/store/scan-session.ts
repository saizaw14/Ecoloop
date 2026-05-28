import type { ScanClassificationResult } from '@/features/scan/types/scan-classification-result';

let latestScanResult: ScanClassificationResult | null = null;

export function getLatestScanResult() {
  return latestScanResult;
}

export function setLatestScanResult(result: ScanClassificationResult) {
  latestScanResult = result;
}

export function clearLatestScanResult() {
  latestScanResult = null;
}
