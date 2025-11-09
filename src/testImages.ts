import { ShapeType } from './main';

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

/**
 * Creates a canvas with the specified dimensions
 */
function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Draws a shape on the canvas
 */
function drawShape(
  ctx: CanvasRenderingContext2D,
  type: ShapeType,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string = '#3498db'
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const radius = Math.min(width, height) / 2;

  switch (type) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'square':
      const size = Math.min(width, height);
      ctx.fillRect(x + (width - size) / 2, y + (height - size) / 2, size, size);
      break;

    case 'rectangle':
      ctx.fillRect(x, y, width, height);
      break;

    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(centerX, y);
      ctx.lineTo(x, y + height);
      ctx.lineTo(x + width, y + height);
      ctx.closePath();
      ctx.fill();
      break;

    case 'pentagon':
      drawRegularPolygon(ctx, centerX, centerY, radius, 5);
      break;
  }
  
  ctx.restore();
}

/**
 * Draws a regular polygon
 */
function drawRegularPolygon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  sides: number
) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    const px = x + radius * Math.cos(angle);
    const py = y + radius * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * Test case: Single shape
 */
function createSingleShapeTest(shape: ShapeType): TestImage {
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext('2d')!;
  
  // White background
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 200, 200);
  
  // Draw the shape
  drawShape(ctx, shape, 50, 50, 100, 100);
  
  return {
    id: `single_${shape}`,
    name: `Single ${shape}`,
    description: `A single ${shape} in the center of the image`,
    expectedShapes: [{
      type: shape,
      minArea: 8000,
      maxArea: 12000,
      count: 1
    }],
    getCanvas: () => canvas
  };
}

/**
 * Test case: Multiple shapes
 */
function createMultipleShapesTest(): TestImage {
  const canvas = createCanvas(400, 300);
  const ctx = canvas.getContext('2d')!;
  
  // White background
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 400, 300);
  
  // Draw multiple shapes
  drawShape(ctx, 'circle', 50, 50, 80, 80);
  drawShape(ctx, 'square', 150, 50, 80, 80);
  drawShape(ctx, 'triangle', 250, 50, 80, 80);
  drawShape(ctx, 'rectangle', 50, 180, 120, 60);
  drawShape(ctx, 'pentagon', 250, 160, 100, 100);
  
  return {
    id: 'multiple_shapes',
    name: 'Multiple Shapes',
    description: 'Multiple shapes of different types',
    expectedShapes: [
      { type: 'circle', minArea: 4000, maxArea: 6000, count: 1 },
      { type: 'square', minArea: 5000, maxArea: 7000, count: 1 },
      { type: 'triangle', minArea: 2500, maxArea: 4000, count: 1 },
      { type: 'rectangle', minArea: 6000, maxArea: 8000, count: 1 },
      { type: 'pentagon', minArea: 7000, maxArea: 9000, count: 1 }
    ],
    getCanvas: () => canvas
  };
}

/**
 * Test case: Overlapping shapes
 */
function createOverlappingShapesTest(): TestImage {
  const canvas = createCanvas(300, 300);
  const ctx = canvas.getContext('2d')!;
  
  // White background
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 300, 300);
  
  // Draw overlapping shapes
  drawShape(ctx, 'circle', 100, 100, 150, 150, 'rgba(52, 152, 219, 0.7)');
  drawShape(ctx, 'square', 50, 50, 200, 200, 'rgba(231, 76, 60, 0.7)');
  
  return {
    id: 'overlapping_shapes',
    name: 'Overlapping Shapes',
    description: 'Two overlapping shapes (circle and square)',
    expectedShapes: [
      { type: 'circle', minArea: 10000, maxArea: 20000, count: 1 },
      { type: 'square', minArea: 30000, maxArea: 45000, count: 1 }
    ],
    getCanvas: () => canvas
  };
}

/**
 * Test case: No shapes (negative case)
 */
function createNoShapesTest(): TestImage {
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext('2d')!;
  
  // White background
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 200, 200);
  
  // Just some text
  ctx.fillStyle = '#000';
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('No shapes here', 100, 100);
  
  return {
    id: 'no_shapes',
    name: 'No Shapes',
    description: 'An image with no detectable shapes',
    expectedShapes: [],
    getCanvas: () => canvas
  };
}

/**
 * All test cases
 */
const testCases: TestImage[] = [
  createSingleShapeTest('circle'),
  createSingleShapeTest('square'),
  createSingleShapeTest('triangle'),
  createSingleShapeTest('rectangle'),
  createSingleShapeTest('pentagon'),
  createMultipleShapesTest(),
  createOverlappingShapesTest(),
  createNoShapesTest()
];

export default testCases;
