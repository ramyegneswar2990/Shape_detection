type ShapeType = 'circle' | 'square' | 'rectangle' | 'triangle' | 'pentagon';

// DOM Elements
const imageInput = document.getElementById('imageInput') as HTMLInputElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const overlay = document.getElementById('overlay') as HTMLCanvasElement;
const resultsContainer = document.getElementById('results') as HTMLDivElement;
const placeholderText = document.querySelector('.placeholder') as HTMLParagraphElement;

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DetectedShape {
  type: ShapeType;
  confidence: number;
  boundingBox: BoundingBox;
  center: { x: number; y: number };
  area: number;
}

interface DetectionResult {
  shapes: DetectedShape[];
  imageStats: {
    width: number;
    height: number;
    processingTimeMs: number;
  };
}

class ShapeDetector {
  private imageData: ImageData | null = null;
  private width: number = 0;
  private height: number = 0;
  private data: Uint8ClampedArray | null = null;
  private binaryMatrix: boolean[][] = [];
  private visited: boolean[][] = [];
  private ctx: CanvasRenderingContext2D;
  private overlayCtx: CanvasRenderingContext2D;

  constructor() {
    this.ctx = canvas.getContext('2d')!;
    this.overlayCtx = overlay.getContext('2d')!;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    imageInput.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await this.processImage(file);
      }
    });
  }

  private async processImage(file: File): Promise<void> {
    try {
      const image = await this.loadImage(file);
      const imageData = this.getImageDataFromImage(image);
      
      // Show loading state
      if (placeholderText) {
        placeholderText.textContent = 'Processing image...';
      }

      // Process the image
      const result = await this.detectShapes(imageData);
      
      // Display results
      this.drawImageAndShapes(imageData, result.shapes);
      this.displayResults(result);
      
    } catch (error) {
      console.error('Error processing image:', error);
      if (placeholderText) {
        placeholderText.textContent = 'Error processing image. Please try another one.';
      }
    }
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private getImageDataFromImage(image: HTMLImageElement): ImageData {
    // Set canvas dimensions to match image
    const maxDimension = 800; // Max dimension for processing
    const ratio = Math.min(maxDimension / image.width, maxDimension / image.height);
    canvas.width = image.width * ratio;
    canvas.height = image.height * ratio;
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    
    // Draw image to canvas
    this.ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    
    // Get image data
    return this.ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  async detectShapes(imageData: ImageData): Promise<DetectionResult> {
    const startTime = performance.now();
    this.imageData = imageData;
    this.width = imageData.width;
    this.height = imageData.height;
    this.data = imageData.data;

    // Initialize binary matrix and visited array
    this.initializeBinaryMatrix();
    this.initializeVisited();

    // Find all shapes in the image
    const shapes: DetectedShape[] = [];
    const minShapeSize = 20; // Minimum number of pixels to consider as a shape
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.binaryMatrix[y][x] && !this.visited[y][x]) {
          const shapePixels = this.floodFill(x, y);
          if (shapePixels.length > minShapeSize) {
            const shape = this.analyzeShape(shapePixels);
            if (shape) {
              shapes.push(shape);
            }
          }
        }
      }
    }

    return {
      shapes,
      imageStats: {
        width: this.width,
        height: this.height,
        processingTimeMs: performance.now() - startTime
      }
    };
  }

  private initializeBinaryMatrix(): void {
    if (!this.data) return;
    
    this.binaryMatrix = [];
    
    // Convert image to grayscale and apply threshold
    for (let y = 0; y < this.height; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < this.width; x++) {
        const i = (y * this.width + x) * 4;
        const r = this.data[i];
        const g = this.data[i + 1];
        const b = this.data[i + 2];
        // Simple threshold to detect non-white pixels
        const isForeground = (r < 240 || g < 240 || b < 240);
        row.push(isForeground);
      }
      this.binaryMatrix.push(row);
    }
  }

  private initializeVisited(): void {
    this.visited = [];
    for (let y = 0; y < this.height; y++) {
      this.visited.push(new Array(this.width).fill(false));
    }
  }

  private floodFill(startX: number, startY: number): {x: number, y: number}[] {
    const pixels: {x: number, y: number}[] = [];
    const queue: {x: number, y: number}[] = [];
    const dx = [-1, 0, 1, -1, 1, -1, 0, 1];
    const dy = [-1, -1, -1, 0, 0, 1, 1, 1];
    
    queue.push({x: startX, y: startY});
    this.visited[startY][startX] = true;
    
    while (queue.length > 0) {
      const {x, y} = queue.shift()!;
      pixels.push({x, y});
      
      for (let i = 0; i < 8; i++) {
        const nx = x + dx[i];
        const ny = y + dy[i];
        
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height && 
            this.binaryMatrix[ny][nx] && !this.visited[ny][nx]) {
          this.visited[ny][nx] = true;
          queue.push({x: nx, y: ny});
        }
      }
    }
    
    return pixels;
  }

  private analyzeShape(pixels: {x: number, y: number}[]): DetectedShape | null {
    if (pixels.length < 10) return null; // Skip very small shapes
    
    // Calculate bounding box
    let minX = this.width, minY = this.height, maxX = 0, maxY = 0;
    let sumX = 0, sumY = 0;
    
    for (const {x, y} of pixels) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      sumX += x;
      sumY += y;
    }
    
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const centerX = sumX / pixels.length;
    const centerY = sumY / pixels.length;
    const area = pixels.length;
    
    // Calculate shape properties
    const aspectRatio = width / Math.max(1, height);
    const extent = area / (width * height);
    
    // Calculate perimeter (approximate)
    let perimeter = 0;
    for (let i = 0; i < pixels.length; i++) {
      const next = (i + 1) % pixels.length;
      const dx = pixels[next].x - pixels[i].x;
      const dy = pixels[next].y - pixels[i].y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    
    // Calculate circularity (1 for perfect circle, less for other shapes)
    const circularity = perimeter > 0 ? (4 * Math.PI * area) / (perimeter * perimeter) : 0;
    
    // Classify shape based on properties
    let type: ShapeType = 'circle';
    let confidence = 0.8;
    
    if (circularity > 0.85) {
      type = 'circle';
      confidence = Math.min(0.99, circularity);
    } else if (Math.abs(aspectRatio - 1) < 0.2 && extent > 0.7) {
      type = 'square';
      confidence = 0.85 * extent;
    } else if (extent > 0.6) {
      type = 'rectangle';
      confidence = 0.8 * extent;
    } else if (extent < 0.6) {
      type = 'triangle';
      confidence = 0.7 * (1 - extent);
    } else {
      type = 'pentagon';
      confidence = 0.6;
    }
    
    // Apply confidence penalty for small shapes
    const sizePenalty = Math.min(1, Math.log10(area / 100) / 2 + 0.8);
    confidence *= sizePenalty;
    
    // Ensure confidence is within bounds
    confidence = Math.max(0.1, Math.min(0.99, confidence));
    
    // Skip shapes with very low confidence
    if (confidence < 0.6) {
      return null;
    }
    
    return {
      type,
      confidence,
      boundingBox: {
        x: minX,
        y: minY,
        width,
        height
      },
      center: {
        x: centerX,
        y: centerY
      },
      area
    };
  }

  private drawImageAndShapes(imageData: ImageData, shapes: DetectedShape[] = []): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
    
    // Draw the original image
    this.ctx.putImageData(imageData, 0, 0);
    
    // Draw shapes
    this.overlayCtx.strokeStyle = '#00ff00';
    this.overlayCtx.lineWidth = 2;
    this.overlayCtx.font = '14px Arial';
    this.overlayCtx.fillStyle = '#00ff00';
    
    shapes.forEach((shape) => {
      // Draw bounding box
      this.overlayCtx.strokeRect(
        shape.boundingBox.x,
        shape.boundingBox.y,
        shape.boundingBox.width,
        shape.boundingBox.height
      );
      
      // Draw center point
      this.overlayCtx.beginPath();
      this.overlayCtx.arc(shape.center.x, shape.center.y, 3, 0, 2 * Math.PI);
      this.overlayCtx.fill();
      
      // Draw shape label
      this.overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.overlayCtx.fillRect(
        shape.boundingBox.x,
        shape.boundingBox.y - 20,
        100,
        20
      );
      
      this.overlayCtx.fillStyle = '#ffffff';
      this.overlayCtx.fillText(
        `${shape.type} (${Math.round(shape.confidence * 100)}%)`,
        shape.boundingBox.x + 5,
        shape.boundingBox.y - 5
      );
      
      this.overlayCtx.fillStyle = '#00ff00';
    });
  }

  private displayResults(result: DetectionResult): void {
    if (!resultsContainer) return;
    
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    if (result.shapes.length === 0) {
      const noShapes = document.createElement('p');
      noShapes.className = 'no-shapes';
      noShapes.textContent = 'No shapes detected in the image.';
      resultsContainer.appendChild(noShapes);
      return;
    }
    
    // Add stats
    const stats = document.createElement('div');
    stats.className = 'stats';
    stats.innerHTML = `
      <p>Image: ${result.imageStats.width} × ${result.imageStats.height}px</p>
      <p>Processing time: ${result.imageStats.processingTimeMs.toFixed(2)}ms</p>
      <p>Shapes detected: ${result.shapes.length}</p>
    `;
    resultsContainer.appendChild(stats);
    
    // Add shape details
    result.shapes.forEach((shape, index) => {
      const shapeElement = document.createElement('div');
      shapeElement.className = 'shape-item';
      shapeElement.innerHTML = `
        <h3>${shape.type.charAt(0).toUpperCase() + shape.type.slice(1)} #${index + 1}</h3>
        <div class="shape-property">
          <span>Confidence:</span>
          <span>${(shape.confidence * 100).toFixed(1)}%</span>
        </div>
        <div class="confidence-bar">
          <div class="confidence-level" style="width: ${shape.confidence * 100}%"></div>
        </div>
        <div class="shape-property">
          <span>Position:</span>
          <span>(${Math.round(shape.center.x)}, ${Math.round(shape.center.y)})</span>
        </div>
        <div class="shape-property">
          <span>Size:</span>
          <span>${shape.boundingBox.width} × ${shape.boundingBox.height}px</span>
        </div>
        <div class="shape-property">
          <span>Area:</span>
          <span>${shape.area.toLocaleString()} px²</span>
        </div>
      `;
      resultsContainer.appendChild(shapeElement);
    });
  }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ShapeDetector();
});
