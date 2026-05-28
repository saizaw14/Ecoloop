import { decode } from 'jpeg-js';
import { File } from 'expo-file-system';

import { getWasteCategory, type WasteCategorySlug } from '@/features/categories/data/category-content';
import type { ScanClassificationResult } from '@/features/scan/types/scan-classification-result';
import wasteClassificationModel from '../../../assets/models/ecoloop_waste_model.tflite';

type TensorDataType =
  | 'float16'
  | 'float32'
  | 'float64'
  | 'int8'
  | 'int16'
  | 'int32'
  | 'uint8'
  | 'uint16'
  | 'uint32';

type TensorShapeLayout = 'nchw' | 'nhwc';

type TensorMetadata = {
  channels: number;
  dataType: TensorDataType;
  height: number;
  layout: TensorShapeLayout;
  width: number;
};

type TensorflowModelDelegate = 'android-gpu' | 'core-ml' | 'metal' | 'nnapi';

type TfliteTensor = {
  dataType: string;
  name: string;
  shape: number[];
};

type TfliteModel = {
  inputs: TfliteTensor[];
  outputs: TfliteTensor[];
  run(input: ArrayBuffer[]): Promise<ArrayBuffer[]>;
};

type CategoryGuidance = {
  co2SavedKg: number;
  nextStep: string;
  summary: string;
};

const MODEL_LABELS = ['cardboard', 'glass', 'metal', 'paper', 'plastic', 'trash'] as const;

const CATEGORY_GUIDANCE: Record<WasteCategorySlug, CategoryGuidance> = {
  cardboard: {
    co2SavedKg: 0.16,
    nextStep: 'Flatten it, keep it dry, and remove any extra plastic or foam inserts before recycling.',
    summary: 'The model detected cardboard-style packaging or box material.',
  },
  general: {
    co2SavedKg: 0,
    nextStep: 'Dispose of it in the trash unless your local guidelines offer a specialist disposal stream.',
    summary: 'The model thinks this item is better suited for the trash than recycling.',
  },
  glass: {
    co2SavedKg: 0.28,
    nextStep: 'Empty the contents, rinse the container, and place it with glass recyclables.',
    summary: 'The model identified this as a glass bottle, jar, or container.',
  },
  metal: {
    co2SavedKg: 0.24,
    nextStep: 'Rinse away residue and place it with clean metal cans or containers.',
    summary: 'The model recognized a metal can or metal container.',
  },
  paper: {
    co2SavedKg: 0.12,
    nextStep: 'Keep it dry and flatten it if possible before placing it in paper recycling.',
    summary: 'The model identified a paper-based item that can likely be recycled.',
  },
  plastic: {
    co2SavedKg: 0.2,
    nextStep: 'Rinse it briefly, let it dry, and place it in the plastic recycling stream.',
    summary: 'The model detected a recyclable plastic container or bottle.',
  },
};

const MODEL_SOURCE = wasteClassificationModel;

let modelPromise: Promise<TfliteModel> | null = null;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getCategorySlugFromLabel(label: (typeof MODEL_LABELS)[number]): WasteCategorySlug {
  if (label === 'trash') {
    return 'general';
  }

  return label;
}

function getModelLoadErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes('NitroModules') ||
    message.includes('TfliteModule') ||
    message.includes('AssetLoader') ||
    message.includes('native')
  ) {
    return 'The real TFLite model needs a custom Expo development build. Expo Go cannot run this native classifier.';
  }

  return 'We could not load the bundled waste classification model.';
}

function getTensorMetadata(inputTensor: TfliteTensor): TensorMetadata {
  const shape = inputTensor.shape;
  const dataType = inputTensor.dataType as TensorDataType;

  if (shape.length !== 4) {
    throw new Error(`Unsupported input tensor shape: ${JSON.stringify(shape)}`);
  }

  if (shape[3] === 3 || shape[3] === 1) {
    return {
      channels: shape[3],
      dataType,
      height: shape[1],
      layout: 'nhwc',
      width: shape[2],
    };
  }

  if (shape[1] === 3 || shape[1] === 1) {
    return {
      channels: shape[1],
      dataType,
      height: shape[2],
      layout: 'nchw',
      width: shape[3],
    };
  }

  throw new Error(`Unsupported channel layout for input tensor: ${JSON.stringify(shape)}`);
}

function resizeAndEncodeRgb(
  sourceRgba: Uint8Array,
  sourceWidth: number,
  sourceHeight: number,
  tensor: TensorMetadata
) {
  const { channels, dataType, height: targetHeight, layout, width: targetWidth } = tensor;

  if (channels !== 3) {
    throw new Error(`Only RGB image models are supported right now. Received ${channels} channels.`);
  }

  const cropSize = Math.min(sourceWidth, sourceHeight);
  const offsetX = Math.floor((sourceWidth - cropSize) / 2);
  const offsetY = Math.floor((sourceHeight - cropSize) / 2);
  const isFloatModel = dataType === 'float16' || dataType === 'float32' || dataType === 'float64';
  const pixelCount = targetWidth * targetHeight * channels;
  const output = isFloatModel ? new Float32Array(pixelCount) : new Uint8Array(pixelCount);

  for (let targetY = 0; targetY < targetHeight; targetY += 1) {
    const sourceY = clamp(
      Math.floor((targetY / Math.max(targetHeight - 1, 1)) * (cropSize - 1)) + offsetY,
      0,
      sourceHeight - 1
    );

    for (let targetX = 0; targetX < targetWidth; targetX += 1) {
      const sourceX = clamp(
        Math.floor((targetX / Math.max(targetWidth - 1, 1)) * (cropSize - 1)) + offsetX,
        0,
        sourceWidth - 1
      );

      const sourceIndex = (sourceY * sourceWidth + sourceX) * 4;
      const red = sourceRgba[sourceIndex] ?? 0;
      const green = sourceRgba[sourceIndex + 1] ?? 0;
      const blue = sourceRgba[sourceIndex + 2] ?? 0;

      if (layout === 'nhwc') {
        const destinationIndex = (targetY * targetWidth + targetX) * 3;

        if (isFloatModel) {
          (output as Float32Array)[destinationIndex] = red / 255;
          (output as Float32Array)[destinationIndex + 1] = green / 255;
          (output as Float32Array)[destinationIndex + 2] = blue / 255;
        } else {
          (output as Uint8Array)[destinationIndex] = red;
          (output as Uint8Array)[destinationIndex + 1] = green;
          (output as Uint8Array)[destinationIndex + 2] = blue;
        }
      } else {
        const redIndex = targetY * targetWidth + targetX;
        const greenIndex = targetWidth * targetHeight + redIndex;
        const blueIndex = targetWidth * targetHeight * 2 + redIndex;

        if (isFloatModel) {
          (output as Float32Array)[redIndex] = red / 255;
          (output as Float32Array)[greenIndex] = green / 255;
          (output as Float32Array)[blueIndex] = blue / 255;
        } else {
          (output as Uint8Array)[redIndex] = red;
          (output as Uint8Array)[greenIndex] = green;
          (output as Uint8Array)[blueIndex] = blue;
        }
      }
    }
  }

  return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
}

function softmax(values: number[]) {
  const max = Math.max(...values);
  const expValues = values.map((value) => Math.exp(value - max));
  const sum = expValues.reduce((total, value) => total + value, 0);

  if (!sum) {
    return values.map(() => 0);
  }

  return expValues.map((value) => value / sum);
}

function normalizeOutputScores(rawScores: number[]) {
  if (!rawScores.length) {
    return rawScores;
  }

  const allProbabilities = rawScores.every((value) => value >= 0 && value <= 1.01);
  const probabilitySum = rawScores.reduce((total, value) => total + value, 0);

  if (allProbabilities && probabilitySum > 0.85 && probabilitySum < 1.15) {
    return rawScores;
  }

  if (allProbabilities && probabilitySum > 0) {
    return rawScores.map((value) => value / probabilitySum);
  }

  return softmax(rawScores);
}

function outputBufferToScores(outputBuffer: ArrayBuffer, dataType: string) {
  if (dataType === 'float16' || dataType === 'float32' || dataType === 'float64') {
    return Array.from(new Float32Array(outputBuffer));
  }

  if (dataType === 'uint8') {
    return Array.from(new Uint8Array(outputBuffer)).map((value) => value / 255);
  }

  if (dataType === 'int8') {
    return Array.from(new Int8Array(outputBuffer));
  }

  if (dataType === 'int16') {
    return Array.from(new Int16Array(outputBuffer));
  }

  if (dataType === 'int32') {
    return Array.from(new Int32Array(outputBuffer));
  }

  return Array.from(new Float32Array(outputBuffer));
}

async function readCapturedImageAsRgbTensor(imageUri: string, inputTensor: TfliteTensor) {
  const file = new File(imageUri);
  const jpegBytes = await file.bytes();
  const decoded = decode(jpegBytes, { formatAsRGBA: true, useTArray: true });
  const tensorMetadata = getTensorMetadata(inputTensor);

  return resizeAndEncodeRgb(decoded.data, decoded.width, decoded.height, tensorMetadata);
}

async function loadRuntime() {
  const runtime = await import('react-native-fast-tflite');
  return runtime;
}

export async function prepareWasteClassifier() {
  if (!modelPromise) {
    modelPromise = (async () => {
      try {
        const { loadTensorflowModel } = await loadRuntime();
        return (await loadTensorflowModel(MODEL_SOURCE, [] as TensorflowModelDelegate[])) as TfliteModel;
      } catch (error) {
        modelPromise = null;
        throw new Error(getModelLoadErrorMessage(error));
      }
    })();
  }

  return modelPromise;
}

export async function classifyWasteImage(imageUri: string): Promise<ScanClassificationResult> {
  const model = await prepareWasteClassifier();
  const inputTensor = model.inputs[0];
  const outputTensor = model.outputs[0];

  if (!inputTensor || !outputTensor) {
    throw new Error('The waste classifier model is missing its input or output tensor.');
  }

  const inputBuffer = await readCapturedImageAsRgbTensor(imageUri, inputTensor);
  const outputBuffers = await model.run([inputBuffer]);
  const firstOutput = outputBuffers[0];

  if (!firstOutput) {
    throw new Error('The waste classifier model did not return a prediction.');
  }

  const rawScores = outputBufferToScores(firstOutput, outputTensor.dataType);
  const scores = normalizeOutputScores(rawScores).slice(0, MODEL_LABELS.length);

  if (!scores.length) {
    throw new Error('The waste classifier output was empty.');
  }

  let topIndex = 0;
  for (let index = 1; index < scores.length; index += 1) {
    if ((scores[index] ?? 0) > (scores[topIndex] ?? 0)) {
      topIndex = index;
    }
  }

  const label = MODEL_LABELS[topIndex] ?? MODEL_LABELS[0];
  const categorySlug = getCategorySlugFromLabel(label);
  const category = getWasteCategory(categorySlug);

  if (!category) {
    throw new Error(`The predicted label "${label}" does not map to an EcoLoop category.`);
  }

  const guidance = CATEGORY_GUIDANCE[categorySlug];
  const confidence = Math.round((scores[topIndex] ?? 0) * 100);

  return {
    acceptedExamples: category.accepted.slice(0, 4),
    capturedAt: new Date().toISOString(),
    categoryName: category.name,
    categorySlug: category.slug,
    co2SavedKg: guidance.co2SavedKg,
    confidence: clamp(confidence, 0, 100),
    description: category.description,
    environmentalImpact: category.environmentalImpact,
    iconBackgroundColor: category.iconBackgroundColor,
    iconName: category.iconName,
    imageUri,
    nextStep: guidance.nextStep,
    preparationSteps: category.preparationSteps.slice(0, 3),
    recyclable: category.recyclable,
    summary: guidance.summary,
  };
}
