import * as tf from '@tensorflow/tfjs';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { decodeJpeg } from '@tensorflow/tfjs-react-native/dist/decode_image';
import { fetch } from '@tensorflow/tfjs-react-native/dist/platform_react_native';

import {
  getWasteCategory,
  type WasteCategorySlug,
} from '@/features/categories/data/category-content';

import modelShard1 from '../../../assets/models/waste-classifier/group1-shard1of3.bin';
import modelShard2 from '../../../assets/models/waste-classifier/group1-shard2of3.bin';
import modelShard3 from '../../../assets/models/waste-classifier/group1-shard3of3.bin';
import wasteClassifierModelJson from '../../../assets/models/waste-classifier/model.json';

export const wasteClassifierLabels = [
  'cardboard',
  'glass',
  'metal',
  'paper',
  'plastic',
  'trash',
] as const;

export type WasteClassifierLabel = (typeof wasteClassifierLabels)[number];

export type WasteClassificationScore = {
  categorySlug: WasteCategorySlug;
  confidence: number;
  label: WasteClassifierLabel;
};

export type WasteClassificationResult = {
  acceptedExamples: string[];
  backend: string;
  capturedAt: string;
  categoryName: string;
  categorySlug: WasteCategorySlug;
  co2SavedKg: number;
  confidence: number;
  description: string;
  environmentalImpact: string;
  iconBackgroundColor: string;
  iconName: NonNullable<ReturnType<typeof getWasteCategory>>['iconName'];
  imageUri: string;
  labelScores: WasteClassificationScore[];
  modelInputSize: number;
  nextStep: string;
  preparationSteps: string[];
  recyclable: boolean;
  summary: string;
  topLabel: WasteClassifierLabel;
};

type ClassificationGuidance = {
  co2SavedKg: number;
  nextStep: string;
  summary: string;
};

type WasteClassifierModelJson = {
  convertedBy?: string | null;
  format?: string;
  generatedBy?: string;
  initializerSignature?: Record<string, unknown>;
  modelInitializer?: Record<string, unknown>;
  modelTopology: Record<string, unknown>;
  signature?: Record<string, unknown>;
  userDefinedMetadata?: Record<string, object>;
  weightsManifest: {
    paths: string[];
    weights: tf.io.WeightsManifestEntry[];
  }[];
};

type LoadedWasteClassifier = {
  backend: string;
  model: tf.GraphModel;
};

const MODEL_INPUT_SIZE = 224;
const EXPECTED_MODEL_FORMAT = 'graph-model';

const MODEL_WEIGHT_SHARDS_BY_PATH = {
  'group1-shard1of3.bin': modelShard1,
  'group1-shard2of3.bin': modelShard2,
  'group1-shard3of3.bin': modelShard3,
} as const;

const labelToCategorySlug = {
  cardboard: 'cardboard',
  glass: 'glass',
  metal: 'metal',
  paper: 'paper',
  plastic: 'plastic',
  trash: 'general',
} as const satisfies Record<WasteClassifierLabel, WasteCategorySlug>;

const classificationGuidanceByLabel = {
  cardboard: {
    co2SavedKg: 0.16,
    summary: 'TensorFlow.js classified this item as cardboard packaging.',
    nextStep:
      'Flatten it, keep it dry, and remove extra plastic or foam inserts before recycling.',
  },
  glass: {
    co2SavedKg: 0.28,
    summary: 'TensorFlow.js classified this item as glass.',
    nextStep:
      'Empty the contents, rinse the container, and recycle it with glass items.',
  },
  metal: {
    co2SavedKg: 0.24,
    summary: 'TensorFlow.js classified this item as metal.',
    nextStep:
      'Rinse away residue and place it with clean metal recyclables.',
  },
  paper: {
    co2SavedKg: 0.12,
    summary: 'TensorFlow.js classified this item as paper.',
    nextStep:
      'Keep it dry and flatten it if possible before placing it in paper recycling.',
  },
  plastic: {
    co2SavedKg: 0.2,
    summary: 'TensorFlow.js classified this item as plastic.',
    nextStep:
      'Rinse it briefly, let it dry, and place it in the plastic recycling stream.',
  },
  trash: {
    co2SavedKg: 0,
    summary: 'TensorFlow.js classified this item as trash rather than a recyclable.',
    nextStep:
      'Dispose of it in the trash unless local guidelines offer a specialist disposal stream.',
  },
} as const satisfies Record<WasteClassifierLabel, ClassificationGuidance>;

let classifierPromise: Promise<LoadedWasteClassifier> | null = null;

function validateWasteClassifierModel(modelJson: WasteClassifierModelJson) {
  if (modelJson.format !== EXPECTED_MODEL_FORMAT) {
    throw new Error(
      `Expected a TensorFlow.js ${EXPECTED_MODEL_FORMAT} export, but found "${modelJson.format ?? 'unknown'}".`
    );
  }

  if (!modelJson.modelTopology) {
    throw new Error('The TensorFlow.js graph export is missing model topology.');
  }

  if (!Array.isArray(modelJson.weightsManifest) || modelJson.weightsManifest.length === 0) {
    throw new Error('The TensorFlow.js graph export is missing its weight manifest.');
  }
}

function mergeArrayBuffers(buffers: ArrayBuffer[]) {
  const totalByteLength = buffers.reduce(
    (runningTotal, buffer) => runningTotal + buffer.byteLength,
    0
  );
  const merged = new Uint8Array(totalByteLength);

  let offset = 0;
  for (const buffer of buffers) {
    merged.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }

  return merged.buffer;
}

function toConfidence(probability: number) {
  return Number((probability * 100).toFixed(1));
}

function getTopLabel(probabilities: number[]) {
  let bestIndex = 0;

  for (let index = 1; index < probabilities.length; index += 1) {
    if (probabilities[index] > probabilities[bestIndex]) {
      bestIndex = index;
    }
  }

  return wasteClassifierLabels[bestIndex];
}

async function ensureTensorFlowReady() {
  await tf.ready();

  try {
    await tf.setBackend('rn-webgl');
  } catch {
    await tf.setBackend('cpu');
  }

  return tf.getBackend();
}

async function readBinaryUri(uri: string) {
  if (uri.startsWith('file://')) {
    return new File(uri).arrayBuffer();
  }

  const response = await fetch(uri, {}, { isBinary: true });
  return response.arrayBuffer();
}

async function loadWeightShardBuffer(asset: Asset) {
  const assetUri = asset.localUri ?? asset.uri;

  if (!assetUri) {
    throw new Error('Unable to resolve the TensorFlow.js weight shard URI.');
  }

  return readBinaryUri(assetUri);
}

async function loadWasteClassifierModel() {
  const modelJson = wasteClassifierModelJson as WasteClassifierModelJson;
  validateWasteClassifierModel(modelJson);

  const weightShardModules = modelJson.weightsManifest.flatMap((group) =>
    group.paths.map((path) => {
      const shardModule = MODEL_WEIGHT_SHARDS_BY_PATH[path as keyof typeof MODEL_WEIGHT_SHARDS_BY_PATH];

      if (!shardModule) {
        throw new Error(`Missing bundled TensorFlow.js weight shard "${path}".`);
      }

      return shardModule;
    })
  );
  const weightAssets = await Asset.loadAsync(weightShardModules);
  const weightBuffers = await Promise.all(
    weightAssets.map((asset) => loadWeightShardBuffer(asset))
  );

  const modelArtifacts: tf.io.ModelArtifacts = {
    convertedBy: modelJson.convertedBy ?? null,
    format: modelJson.format,
    generatedBy: modelJson.generatedBy,
    initializerSignature: modelJson.initializerSignature,
    modelInitializer: modelJson.modelInitializer,
    modelTopology: modelJson.modelTopology,
    signature: modelJson.signature,
    userDefinedMetadata: modelJson.userDefinedMetadata,
    weightData: mergeArrayBuffers(weightBuffers),
    weightSpecs: modelJson.weightsManifest.flatMap((group) => group.weights),
  };

  return tf.loadGraphModel({
    load: async () => modelArtifacts,
  });
}

async function createWasteClassifier() {
  const backend = await ensureTensorFlowReady();
  const model = await loadWasteClassifierModel();

  tf.tidy(() => {
    const warmupOutput = model.predict(
      tf.zeros([1, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE, 3])
    ) as tf.Tensor | tf.Tensor[];

    if (Array.isArray(warmupOutput)) {
      warmupOutput.forEach((tensor) => tensor.dispose());
      return;
    }

    warmupOutput.dispose();
  });

  return {
    backend,
    model,
  } satisfies LoadedWasteClassifier;
}

async function getWasteClassifier() {
  if (!classifierPromise) {
    classifierPromise = createWasteClassifier().catch((error) => {
      classifierPromise = null;
      throw error;
    });
  }

  return classifierPromise;
}

async function decodeImageUri(imageUri: string) {
  const imageBuffer = new Uint8Array(await readBinaryUri(imageUri));
  return decodeJpeg(imageBuffer, 3);
}

export async function warmUpWasteClassifier() {
  await getWasteClassifier();
}

export async function classifyWasteImage(imageUri: string) {
  const [{ backend, model }, imageTensor] = await Promise.all([
    getWasteClassifier(),
    decodeImageUri(imageUri),
  ]);

  try {
    const probabilities = tf.tidy(() => {
      const resizedTensor = tf.image.resizeBilinear(
        imageTensor.toFloat(),
        [MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]
      );
      const normalizedTensor = resizedTensor.div(127.5).sub(1);
      const batchedTensor = normalizedTensor.expandDims(0);
      const modelOutput = model.predict(batchedTensor) as tf.Tensor | tf.Tensor[];
      const outputTensor = Array.isArray(modelOutput) ? modelOutput[0] : modelOutput;

      return Array.from(outputTensor.dataSync());
    });

    if (probabilities.length !== wasteClassifierLabels.length) {
      throw new Error('The TensorFlow.js model output does not match the expected label count.');
    }

    const topLabel = getTopLabel(probabilities);
    const categorySlug = labelToCategorySlug[topLabel];
    const category = getWasteCategory(categorySlug);
    const guidance = classificationGuidanceByLabel[topLabel];

    if (!category) {
      throw new Error(`Unable to find category data for label "${topLabel}".`);
    }

    return {
      acceptedExamples: category.accepted.slice(0, 4),
      backend,
      capturedAt: new Date().toISOString(),
      categoryName: category.name,
      categorySlug,
      co2SavedKg: guidance.co2SavedKg,
      confidence: toConfidence(
        probabilities[wasteClassifierLabels.indexOf(topLabel)] ?? 0
      ),
      description: category.description,
      environmentalImpact: category.environmentalImpact,
      iconBackgroundColor: category.iconBackgroundColor,
      iconName: category.iconName,
      imageUri,
      labelScores: wasteClassifierLabels.map((label, index) => ({
        categorySlug: labelToCategorySlug[label],
        confidence: toConfidence(probabilities[index] ?? 0),
        label,
      })),
      modelInputSize: MODEL_INPUT_SIZE,
      nextStep: guidance.nextStep,
      preparationSteps: category.preparationSteps.slice(0, 3),
      recyclable: category.recyclable,
      summary: guidance.summary,
      topLabel,
    } satisfies WasteClassificationResult;
  } finally {
    imageTensor.dispose();
  }
}
