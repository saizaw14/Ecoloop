import type { WasteClassificationResult } from '@/features/scan/services/waste-classification-service';

let latestScanResult: WasteClassificationResult | null = null;

export function getLatestScanResult() {
  return latestScanResult;
}

export function setLatestScanResult(result: WasteClassificationResult) {
  latestScanResult = result;
}

export function clearLatestScanResult() {
  latestScanResult = null;
}
