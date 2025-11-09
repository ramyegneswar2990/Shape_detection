/**
 * Utility functions for evaluating shape detection results
 */

import { DetectedShape, ShapeType } from './main';

export interface TestCase {
  id: string;
  description: string;
  imagePath: string;
  expectedShapes: Array<{
    type: ShapeType;
    center: { x: number; y: number };
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
}

export interface EvaluationResult {
  testCaseId: string;
  passed: boolean;
  detectedShapes: number;
  expectedShapes: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  shapeWiseResults: Record<string, {
    detected: number;
    expected: number;
    correct: number;
  }>;
  details: Array<{
    expected: ShapeType | 'none';
    detected: ShapeType | 'none';
    confidence: number;
    isCorrect: boolean;
  }>;
}

export function calculateIoU(
  box1: { x: number; y: number; width: number; height: number },
  box2: { x: number; y: number; width: number; height: number }
): number {
  // Calculate intersection coordinates
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

  // Calculate areas
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const area1 = box1.width * box1.height;
  const area2 = box2.width * box2.height;
  const union = area1 + area2 - intersection;

  return intersection / union;
}

export function isShapeMatch(
  detected: DetectedShape,
  expected: TestCase['expectedShapes'][0],
  iouThreshold = 0.5
): boolean {
  const iou = calculateIoU(detected.boundingBox, expected.boundingBox);
  const centerDistance = Math.sqrt(
    Math.pow(detected.center.x - expected.center.x, 2) +
    Math.pow(detected.center.y - expected.center.y, 2)
  );
  
  // Consider it a match if IoU is above threshold and centers are close
  const maxCenterDistance = Math.sqrt(
    Math.pow(detected.boundingBox.width, 2) +
    Math.pow(detected.boundingBox.height, 2)
  ) * 0.5;

  return (
    iou >= iouThreshold &&
    centerDistance <= maxCenterDistance &&
    detected.type === expected.type
  );
}

export function calculateMetrics(
  testCase: TestCase,
  detectedShapes: DetectedShape[]
): EvaluationResult {
  const result: EvaluationResult = {
    testCaseId: testCase.id,
    passed: false,
    detectedShapes: detectedShapes.length,
    expectedShapes: testCase.expectedShapes.length,
    truePositives: 0,
    falsePositives: 0,
    falseNegatives: 0,
    precision: 0,
    recall: 0,
    f1Score: 0,
    shapeWiseResults: {},
    details: []
  };

  // Initialize shape-wise counters
  const shapeTypes = [...new Set([
    ...testCase.expectedShapes.map(s => s.type),
    ...detectedShapes.map(s => s.type)
  ])];

  shapeTypes.forEach(type => {
    result.shapeWiseResults[type] = {
      detected: 0,
      expected: 0,
      correct: 0
    };
  });

  // Count expected shapes by type
  testCase.expectedShapes.forEach(shape => {
    result.shapeWiseResults[shape.type].expected++;
  });

  // Count detected shapes and matches
  const matchedExpectedIndices = new Set<number>();
  
  detectedShapes.forEach((detected) => {
    result.shapeWiseResults[detected.type].detected++;
    
    // Find best matching expected shape
    let bestMatchIdx = -1;
    let bestIoU = 0;
    
    testCase.expectedShapes.forEach((expected, j) => {
      if (matchedExpectedIndices.has(j)) return;
      
      const iou = calculateIoU(detected.boundingBox, expected.boundingBox);
      if (iou > bestIoU) {
        bestIoU = iou;
        bestMatchIdx = j;
      }
    });

    if (bestMatchIdx >= 0 && bestIoU >= 0.5) {
      const expected = testCase.expectedShapes[bestMatchIdx];
      const isCorrect = detected.type === expected.type;
      
      if (isCorrect) {
        result.truePositives++;
        result.shapeWiseResults[detected.type].correct++;
        matchedExpectedIndices.add(bestMatchIdx);
      }
      
      result.details.push({
        expected: expected.type,
        detected: detected.type,
        confidence: detected.confidence,
        isCorrect
      });
    } else {
      result.falsePositives++;
      result.details.push({
        expected: 'none',
        detected: detected.type,
        confidence: detected.confidence,
        isCorrect: false
      });
    }
  });

  // Calculate false negatives
  result.falseNegatives = testCase.expectedShapes.length - matchedExpectedIndices.size;

  // Calculate precision, recall, and F1 score
  result.precision = result.truePositives / (result.truePositives + result.falsePositives) || 0;
  result.recall = result.truePositives / (result.truePositives + result.falseNegatives) || 0;
  result.f1Score = 2 * (result.precision * result.recall) / (result.precision + result.recall) || 0;
  
  // Test passes if all expected shapes are detected correctly
  result.passed = result.falsePositives === 0 && result.falseNegatives === 0;

  return result;
}
