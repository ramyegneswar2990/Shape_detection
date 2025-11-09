import { ShapeDetector, DetectionResult } from './main';
import { EvaluationManager } from './evaluation-manager';
import { TestCase } from './evaluation-utils';

class ShapeDetectionEvaluator {
  private shapeDetector: ShapeDetector;
  private evaluationManager: EvaluationManager;

  constructor() {
    this.shapeDetector = new ShapeDetector();
    this.evaluationManager = new EvaluationManager();
  }

  async loadTestCases(testCases: TestCase[]): Promise<void> {
    testCases.forEach(testCase => {
      this.evaluationManager.addTestCase(testCase);
    });
  }

  async runEvaluation(image: HTMLImageElement, testCaseId?: string): Promise<DetectionResult> {
    // Process the image
    const imageData = this.shapeDetector.getImageDataFromImage(image);
    const result = await this.shapeDetector.detectShapes(imageData);
    
    // Evaluate the results
    await this.evaluationManager.evaluate(result.shapes, testCaseId);
    
    return result;
  }

  getEvaluationResults() {
    return this.evaluationManager.getResults();
  }

  generateReport(): string {
    return this.evaluationManager.generateReport();
  }

  saveResults(filename: string = 'evaluation-results.json'): void {
    this.evaluationManager.saveResultsToFile(filename);
  }
}

// Example usage:
/*
async function runExample() {
  const evaluator = new ShapeDetectionEvaluator();
  
  // Define test cases
  const testCases: TestCase[] = [
    {
      id: 'test-1',
      description: 'Single circle detection',
      imagePath: '/test-images/circle.png',
      expectedShapes: [
        {
          type: 'circle',
          center: { x: 100, y: 100 },
          boundingBox: { x: 50, y: 50, width: 100, height: 100 }
        }
      ]
    },
    // Add more test cases as needed
  ];

  // Load test cases
  await evaluator.loadTestCases(testCases);

  // Run evaluation for each test case
  for (const testCase of testCases) {
    const img = await loadImage(testCase.imagePath);
    await evaluator.runEvaluation(img, testCase.id);
  }

  // Generate and log report
  console.log(evaluator.generateReport());
  
  // Save detailed results to file
  evaluator.saveResults();
}
*/

export { ShapeDetectionEvaluator };
