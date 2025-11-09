import { ShapeDetector, DetectionResult } from './main';
import testCases from './testImages';

class TestRunner {
  private detector: ShapeDetector;
  
  constructor() {
    this.detector = new ShapeDetector();
  }

  /**
   * Run all test cases and return results
   */
  async runAllTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    for (const testCase of testCases) {
      console.log(`\nRunning test: ${testCase.name}`);
      const result = await this.runTest(testCase);
      results.push(result);
      this.logTestResult(result);
    }
    
    return results;
  }
  
  /**
   * Run a single test case
   */
  private async runTest(testCase: TestImage): Promise<TestResult> {
    const canvas = testCase.getCanvas();
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const startTime = performance.now();
    
    try {
      const result = await this.detector.detectShapes(imageData);
      const processingTime = performance.now() - startTime;
      
      return {
        testId: testCase.id,
        testName: testCase.name,
        passed: this.evaluateResult(testCase, result),
        processingTime,
        detectedShapes: result.shapes,
        expectedShapes: testCase.expectedShapes,
        imageData: imageData
      };
    } catch (error) {
      console.error(`Error running test ${testCase.id}:`, error);
      return {
        testId: testCase.id,
        testName: testCase.name,
        passed: false,
        processingTime: performance.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        detectedShapes: [],
        expectedShapes: testCase.expectedShapes,
        imageData: imageData
      };
    }
  }
  
  /**
   * Evaluate if the detection result matches the expected shapes
   */
  private evaluateResult(testCase: TestImage, result: DetectionResult): boolean {
    // Check if we have the expected number of shapes
    const shapeCounts = new Map<ShapeType, number>();
    
    for (const shape of result.shapes) {
      shapeCounts.set(shape.type, (shapeCounts.get(shape.type) || 0) + 1);
    }
    
    for (const expected of testCase.expectedShapes) {
      const actualCount = shapeCounts.get(expected.type) || 0;
      if (actualCount !== expected.count) {
        return false;
      }
    }
    
    // Check areas of detected shapes
    for (const shape of result.shapes) {
      const expected = testCase.expectedShapes.find(s => s.type === shape.type);
      if (expected) {
        if (shape.area < expected.minArea || shape.area > expected.maxArea) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Log test results in a readable format
   */
  private logTestResult(result: TestResult): void {
    console.log(`\n=== Test: ${result.testName} ===`);
    console.log(`Status: ${result.passed ? 'PASSED' : 'FAILED'}`);
    
    if (result.error) {
      console.error(`Error: ${result.error}`);
      return;
    }
    
    console.log(`Processing time: ${result.processingTime.toFixed(2)}ms`);
    
    // Log expected shapes
    console.log('\nExpected shapes:');
    result.expectedShapes.forEach(shape => {
      console.log(`- ${shape.count}x ${shape.type} (area: ${shape.minArea}-${shape.maxArea})`);
    });
    
    // Log detected shapes
    console.log('\nDetected shapes:');
    if (result.detectedShapes.length === 0) {
      console.log('- None');
    } else {
      result.detectedShapes.forEach((shape, i) => {
        console.log(`- Shape ${i + 1}:`);
        console.log(`  Type: ${shape.type}`);
        console.log(`  Confidence: ${(shape.confidence * 100).toFixed(1)}%`);
        console.log(`  Area: ${shape.area}`);
        console.log(`  Bounding box: (${shape.boundingBox.x}, ${shape.boundingBox.y}) ${shape.boundingBox.width}x${shape.boundingBox.height}`);
      });
    }
    
    // Visualize the results
    this.visualizeResult(result);
  }
  
  /**
   * Visualize the test results on a canvas
   */
  private visualizeResult(result: TestResult): void {
    // Create a container for the test visualization
    const container = document.createElement('div');
    container.style.margin = '20px';
    container.style.padding = '10px';
    container.style.border = '1px solid #ddd';
    container.style.borderRadius = '5px';
    container.style.maxWidth = '800px';
    
    // Add test title
    const title = document.createElement('h3');
    title.textContent = `Test: ${result.testName} (${result.passed ? '✅ PASSED' : '❌ FAILED'})`;
    container.appendChild(title);
    
    // Create canvas for original image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = result.imageData.width;
    canvas.height = result.imageData.height;
    ctx.putImageData(result.imageData, 0, 0);
    
    // Create canvas for detected shapes
    const overlay = document.createElement('canvas');
    const overlayCtx = overlay.getContext('2d')!;
    overlay.width = result.imageData.width;
    overlay.height = result.imageData.height;
    
    // Draw detected shapes
    result.detectedShapes.forEach(shape => {
      const bbox = shape.boundingBox;
      const center = shape.center;
      
      // Draw bounding box
      overlayCtx.strokeStyle = '#00ff00';
      overlayCtx.lineWidth = 2;
      overlayCtx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
      
      // Draw center point
      overlayCtx.fillStyle = '#ff0000';
      overlayCtx.beginPath();
      overlayCtx.arc(center.x, center.y, 3, 0, Math.PI * 2);
      overlayCtx.fill();
      
      // Draw label
      overlayCtx.fillStyle = '#000';
      overlayCtx.font = '12px Arial';
      overlayCtx.fillText(
        `${shape.type} (${(shape.confidence * 100).toFixed(0)}%)`,
        bbox.x + 5,
        bbox.y - 5
      );
    });
    
    // Position canvases
    const canvasContainer = document.createElement('div');
    canvasContainer.style.position = 'relative';
    canvasContainer.style.display = 'inline-block';
    
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.pointerEvents = 'none';
    
    canvasContainer.appendChild(canvas);
    canvasContainer.appendChild(overlay);
    container.appendChild(canvasContainer);
    
    // Add test details
    const details = document.createElement('div');
    details.style.marginTop = '10px';
    details.innerHTML = `
      <div>Status: <strong>${result.passed ? 'PASSED' : 'FAILED'}</strong></div>
      <div>Processing time: <strong>${result.processingTime.toFixed(2)}ms</strong></div>
      <div>Detected shapes: <strong>${result.detectedShapes.length}</strong></div>
      ${result.error ? `<div style="color: red">Error: ${result.error}</div>` : ''}
    `;
    container.appendChild(details);
    
    // Add to the document
    document.body.appendChild(container);
  }
}

// Types
interface TestResult {
  testId: string;
  testName: string;
  passed: boolean;
  processingTime: number;
  error?: string;
  detectedShapes: Array<{
    type: ShapeType;
    confidence: number;
    area: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    center: {
      x: number;
      y: number;
    };
  }>;
  expectedShapes: Array<{
    type: ShapeType;
    minArea: number;
    maxArea: number;
    count: number;
  }>;
  imageData: ImageData;
}

interface TestImage {
  id: string;
  name: string;
  description: string;
  expectedShapes: Array<{
    type: ShapeType;
    minArea: number;
    maxArea: number;
    count: number;
  }>;
  getCanvas: () => HTMLCanvasElement;
}

type ShapeType = 'circle' | 'square' | 'rectangle' | 'triangle' | 'pentagon';

// Function to update the test statistics
function updateStats(total: number, passed: number) {
  const totalEl = document.getElementById('totalTests');
  const passedEl = document.getElementById('passedTests');
  const failedEl = document.getElementById('failedTests');
  const successRateEl = document.getElementById('successRate');
  
  if (totalEl) totalEl.textContent = total.toString();
  if (passedEl) passedEl.textContent = passed.toString();
  if (failedEl) failedEl.textContent = (total - passed).toString();
  if (successRateEl) {
    const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
    successRateEl.textContent = `${rate}%`;
  }
}

// Function to display a test result
function displayTestResult(result: TestResult) {
  const testResults = document.getElementById('testResults');
  if (!testResults) return;

  const testCase = document.createElement('div');
  testCase.className = `test-case ${result.passed ? 'test-passed' : 'test-failed'}`;
  
  // Create canvas for the test image
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = result.imageData.width;
  canvas.height = result.imageData.height;
  ctx.putImageData(result.imageData, 0, 0);
  
  // Create overlay for detected shapes
  const overlay = document.createElement('canvas');
  overlay.className = 'test-overlay';
  overlay.width = result.imageData.width;
  overlay.height = result.imageData.height;
  const overlayCtx = overlay.getContext('2d')!;
  
  // Draw detected shapes on overlay
  result.detectedShapes.forEach(shape => {
    const bbox = shape.boundingBox;
    
    // Draw bounding box
    overlayCtx.strokeStyle = result.passed ? '#27ae60' : '#e74c3c';
    overlayCtx.lineWidth = 2;
    overlayCtx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
    
    // Draw center point
    overlayCtx.fillStyle = '#e74c3c';
    overlayCtx.beginPath();
    overlayCtx.arc(shape.center.x, shape.center.y, 3, 0, Math.PI * 2);
    overlayCtx.fill();
    
    // Draw label
    overlayCtx.fillStyle = '#000';
    overlayCtx.font = '12px Arial';
    overlayCtx.fillText(
      `${shape.type} (${Math.round(shape.confidence * 100)}%)`,
      bbox.x + 5,
      bbox.y - 5
    );
  });
  
  // Create test info
  const testInfo = document.createElement('div');
  testInfo.className = 'test-info';
  testInfo.innerHTML = `
    <h3 class="test-title">${result.testName}</h3>
    <div class="test-details">
      <div>Status: <strong>${result.passed ? '✅ PASSED' : '❌ FAILED'}</strong></div>
      <div>Time: <strong>${result.processingTime.toFixed(2)}ms</strong></div>
      <div>Detected: <strong>${result.detectedShapes.length} shapes</strong></div>
      ${result.error ? `<div class="error-message">${result.error}</div>` : ''}
    </div>
  `;
  
  // Create container for canvas and overlay
  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'canvas-container';
  canvasContainer.style.width = '100%';
  canvasContainer.style.position = 'relative';
  
  // Make canvas responsive
  canvas.style.maxWidth = '100%';
  canvas.style.height = 'auto';
  overlay.style.position = 'absolute';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = 'auto';
  
  canvasContainer.appendChild(canvas);
  canvasContainer.appendChild(overlay);
  
  // Add everything to the test case
  testCase.appendChild(canvasContainer);
  testCase.appendChild(testInfo);
  
  // Add to results
  testResults.appendChild(testCase);
}

// Function to initialize the test runner when DOM is ready
function initTestRunner() {
  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    console.warn('Test runner can only run in a browser environment');
    return;
  }

  // Show loading state
  const resultsContainer = document.getElementById('test-results');
  if (resultsContainer) {
    resultsContainer.innerHTML = '<div class="loading">Running tests...</div>';
  }

  // Create and run the test runner
  const runTests = async () => {
    try {
      const runner = new TestRunner();
      const results = await runner.runAllTests();
      
      // Display results
      if (resultsContainer) {
        resultsContainer.innerHTML = '';
        results.forEach(result => {
          displayTestResult(result);
        });
        
        // Update stats
        const passed = results.filter(r => r.passed).length;
        updateStats(results.length, passed);
      }
    } catch (error) {
      console.error('Error running tests:', error);
      if (resultsContainer) {
        resultsContainer.innerHTML = `
          <div class="error">
            <h3>Error running tests</h3>
            <pre>${error instanceof Error ? error.message : String(error)}</pre>
          </div>
        `;
      }
    }
  };

  // Check if DOM is already loaded
  if (document.readyState === 'loading') {
    // Wait for DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', runTests);
  } else {
    // DOM is already loaded, run tests immediately
    runTests();
  }
}

// Initialize the test runner
initTestRunner();

export default TestRunner;
