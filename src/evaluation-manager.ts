import { TestCase, EvaluationResult, calculateMetrics } from './evaluation-utils';
import { DetectedShape } from './main';

export class EvaluationManager {
  private testCases: TestCase[] = [];
  private results: EvaluationResult[] = [];
  private currentTestCaseIndex = -1;

  constructor(testCases: TestCase[] = []) {
    this.testCases = testCases;
  }

  addTestCase(testCase: TestCase): void {
    this.testCases.push(testCase);
  }

  getTestCase(index: number): TestCase | undefined {
    return this.testCases[index];
  }

  getCurrentTestCase(): TestCase | undefined {
    return this.testCases[this.currentTestCaseIndex];
  }

  getTestCases(): TestCase[] {
    return [...this.testCases];
  }

  getResults(): EvaluationResult[] {
    return [...this.results];
  }

  async evaluate(
    detectedShapes: DetectedShape[],
    testCaseId?: string
  ): Promise<EvaluationResult> {
    const testCase = testCaseId
      ? this.testCases.find(tc => tc.id === testCaseId)
      : this.testCases[this.currentTestCaseIndex];

    if (!testCase) {
      throw new Error('No test case found');
    }

    const result = calculateMetrics(testCase, detectedShapes);
    this.results.push(result);
    return result;
  }

  getOverallMetrics() {
    if (this.results.length === 0) {
      return {
        totalTests: 0,
        passedTests: 0,
        successRate: 0,
        averagePrecision: 0,
        averageRecall: 0,
        averageF1Score: 0,
      };
    }

    const sum = this.results.reduce(
      (acc, curr) => ({
        precision: acc.precision + curr.precision,
        recall: acc.recall + curr.recall,
        f1Score: acc.f1Score + curr.f1Score,
      }),
      { precision: 0, recall: 0, f1Score: 0 }
    );

    const count = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;

    return {
      totalTests: count,
      passedTests,
      successRate: passedTests / count,
      averagePrecision: sum.precision / count,
      averageRecall: sum.recall / count,
      averageF1Score: sum.f1Score / count,
    };
  }

  generateReport(): string {
    const overall = this.getOverallMetrics();
    
    let report = `# Shape Detection Evaluation Report\n`;
    report += `## Summary\n`;
    report += `- **Total Tests**: ${overall.totalTests}\n`;
    report += `- **Passed Tests**: ${overall.passedTests}\n`;
    report += `- **Success Rate**: ${(overall.successRate * 100).toFixed(2)}%\n`;
    report += `- **Average Precision**: ${(overall.averagePrecision * 100).toFixed(2)}%\n`;
    report += `- **Average Recall**: ${(overall.averageRecall * 100).toFixed(2)}%\n`;
    report += `- **Average F1 Score**: ${overall.averageF1Score.toFixed(4)}\n\n`;

    report += `## Detailed Results\n`;
    this.results.forEach((result, index) => {
      const testCase = this.testCases.find(tc => tc.id === result.testCaseId);
      report += `### Test Case ${index + 1}: ${testCase?.description || result.testCaseId}\n`;
      report += `- **Status**: ${result.passed ? '✅ Passed' : '❌ Failed'}\n`;
      report += `- **Shapes Detected**: ${result.detectedShapes} (Expected: ${result.expectedShapes})\n`;
      report += `- **Precision**: ${(result.precision * 100).toFixed(2)}%\n`;
      report += `- **Recall**: ${(result.recall * 100).toFixed(2)}%\n`;
      report += `- **F1 Score**: ${result.f1Score.toFixed(4)}\n\n`;
    });

    return report;
  }

  saveResultsToFile(filename: string = 'evaluation-results.json'): void {
    const report = {
      timestamp: new Date().toISOString(),
      overallMetrics: this.getOverallMetrics(),
      results: this.results,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
