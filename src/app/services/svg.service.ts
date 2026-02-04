import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SvgService {

  constructor() { }

  /**
   * Save SVG element as a downloadable file
   */
  saveSVG(svgElement: SVGElement, filename?: string): void {
    svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const svgData = svgElement.outerHTML;
    const preface = '<?xml version="1.0" standalone="no"?>\r\n';
    const blob = new Blob([preface, svgData], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `drawing-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Send SVG data to API endpoint
   */
  async sendToApi(svgElement: SVGElement): Promise<any> {
    svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const svgData = svgElement.outerHTML;
    const preface = '<?xml version="1.0" standalone="no"?>\r\n';
    const fullSvg = preface + svgData;

    const response = await fetch(environment.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        svg: fullSvg,
        timestamp: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send SVG');
    }

    return response.json();
  }

  /**
   * Load SVG content from a URL
   */
  async loadSVGFromUrl(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch SVG');
    }
    return response.text();
  }

  /**
   * Load SVG content from a File object
   */
  loadSVGFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const svgContent = e.target?.result as string;
        resolve(svgContent);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}
