import { Injectable } from '@angular/core';
import { getStroke } from 'perfect-freehand';
import { DrawingStroke, ToolConfig, EASINGS } from '../models';

@Injectable({
  providedIn: 'root'
})
export class DrawingService {

  constructor() { }

  /**
   * Get library options for perfect-freehand based on tool configuration
   */
  getLibOptions(tool: ToolConfig): any {
    return {
      size: tool.size,
      thinning: tool.thinning,
      streamline: tool.streamline,
      smoothing: tool.smoothing,
      easing: EASINGS[tool.easing],
      start: {
        taper: tool.start.taper,
        easing: EASINGS[tool.start.easing],
        cap: true,
      },
      end: {
        taper: tool.end.taper,
        easing: EASINGS[tool.end.easing],
        cap: true,
      },
    };
  }

  /**
   * Convert stroke points to SVG path string
   */
  getSvgPathFromStroke(stroke: number[][]): string {
    if (!stroke.length) return '';
    const d = stroke.reduce(
      (acc, [x0, y0], i, _arr) => {
        const [x1, y1] = _arr[(i + 1) % _arr.length];
        acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
        return acc;
      },
      ['M', ...stroke[0], 'Q'],
    );
    d.push('Z');
    return d.join(' ');
  }

  /**
   * Generate preview path from current points and tool config
   */
  generatePreviewPath(points: number[][], tool: ToolConfig): string {
    const strokePoints = getStroke(points, this.getLibOptions(tool));
    return this.getSvgPathFromStroke(strokePoints);
  }

  /**
   * Extract coordinate pairs from SVG path data
   */
  extractPointsFromPath(d: string): number[][] {
    const points: number[][] = [];
    const regex = /[-+]?[0-9]*\.?[0-9]+/g;
    const numbers = d.match(regex);

    if (numbers) {
      for (let i = 0; i < numbers.length - 1; i += 2) {
        const x = parseFloat(numbers[i]);
        const y = parseFloat(numbers[i + 1]);
        if (!isNaN(x) && !isNaN(y)) {
          points.push([x, y, 0.5]); // Default pressure
        }
      }
    }

    return points;
  }

  /**
   * Parse SVG content and extract strokes
   */
  parseSVGContent(svgContent: string): DrawingStroke[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');

    if (!svgElement) {
      console.error('Invalid SVG file');
      return [];
    }

    const strokes: DrawingStroke[] = [];
    const paths = svgElement.querySelectorAll('path');

    paths.forEach((path) => {
      const d = path.getAttribute('d');
      if (d) {
        const fill = path.getAttribute('fill') || '#000000';
        const fillOpacity = parseFloat(path.getAttribute('fill-opacity') || '1');
        const stroke = path.getAttribute('stroke') || 'none';
        const strokeWidth = parseFloat(path.getAttribute('stroke-width') || '0');

        const points = this.extractPointsFromPath(d);

        strokes.push({
          points: points,
          path: d,
          color: fill === 'none' ? '#000000' : fill,
          opacity: fillOpacity,
          outlineColor: stroke === 'none' ? '#000000' : stroke,
          outlineWidth: strokeWidth,
        });
      }
    });

    return strokes;
  }

  /**
   * Check if a point is close enough to a stroke for erasing
   */
  shouldEraseStroke(stroke: DrawingStroke, x: number, y: number, eraserSize: number): boolean {
    return stroke.points.some(
      (p) => Math.hypot(p[0] - x, p[1] - y) < eraserSize
    );
  }

  /**
   * Get default tool configuration
   */
  getDefaultTool(color: string, size: number, opacity: number = 1): ToolConfig {
    return {
      color,
      size,
      opacity,
      thinning: 0.5,
      streamline: 0.5,
      smoothing: 0.23,
      easing: 'linear',
      start: { taper: 0, easing: 'linear' },
      end: { taper: 0, easing: 'linear' },
      outline: { color: '#9747ff', width: 0 },
    };
  }
}
