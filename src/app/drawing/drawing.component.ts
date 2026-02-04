import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DrawingStroke, ToolConfig, EraserConfig, EASINGS } from '../models';
import { DrawingService, SvgService } from '../services';

@Component({
  selector: 'app-drawing',
  templateUrl: './drawing.component.html',
  styleUrls: ['./drawing.component.scss'],
})
export class DrawingComponent implements OnInit {
  @ViewChild('svgElement') svgElement!: ElementRef<SVGElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  isDragging = false;
  sidebarOpen = false;
  isSending = false;

  allStrokes: DrawingStroke[] = [];
  redoStack: DrawingStroke[] = [];
  activeTool: 'pen1' | 'pen2' | 'highlighter' | 'eraser' = 'pen1';

  currentPoints: number[][] = [];
  previewPath: string = '';

  easingOptions = Object.keys(EASINGS).map((key) => ({
    label: key,
    value: key,
  }));

  tools: {
    pen1: ToolConfig;
    pen2: ToolConfig;
    highlighter: ToolConfig;
    eraser: EraserConfig;
  } = {
    pen1: this.drawingService.getDefaultTool('#eb454a', 16),
    pen2: this.drawingService.getDefaultTool('#3b82f6', 16),
    highlighter: this.drawingService.getDefaultTool('#ffeb3b', 30, 0.4),
    eraser: { size: 40 },
  };

  /** Returns the active tool as ToolConfig (defaults to pen1 if eraser is active) */
  get activeDrawingTool(): ToolConfig {
    if (this.activeTool === 'eraser') {
      return this.tools.pen1;
    }
    return this.tools[this.activeTool];
  }

  constructor(
    private route: ActivatedRoute,
    private drawingService: DrawingService,
    private svgService: SvgService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      // Check for base64 encoded SVG
      if (params['svg']) {
        try {
          const svgContent = atob(params['svg']);
          this.loadSVGContent(svgContent);
        } catch (e) {
          console.error('Invalid base64 SVG data', e);
        }
      }
      // Check for SVG URL
      if (params['url']) {
        this.loadSVGFromUrl(params['url']);
      }
    });
  }

  private async loadSVGFromUrl(url: string) {
    try {
      const svgContent = await this.svgService.loadSVGFromUrl(url);
      this.loadSVGContent(svgContent);
    } catch (error) {
      console.error('Error loading SVG from URL:', error);
    }
  }

  private loadSVGContent(svgContent: string) {
    const strokes = this.drawingService.parseSVGContent(svgContent);
    this.allStrokes = strokes;
    this.redoStack = [];
  }

  resetPenSettings() {
    if (this.activeTool === 'eraser') return;
    const defaults = {
      pen1: { color: '#eb454a', size: 16 },
      pen2: { color: '#3b82f6', size: 16 },
      highlighter: { color: '#ffeb3b', size: 30, opacity: 0.4 },
    };
    const d = (defaults as any)[this.activeTool];
    this.tools[this.activeTool] = this.drawingService.getDefaultTool(
      d.color,
      d.size,
      d.opacity || 1,
    );
  }

  undo() {
    const s = this.allStrokes.pop();
    if (s) this.redoStack.push(s);
  }

  redo() {
    const s = this.redoStack.pop();
    if (s) this.allStrokes.push(s);
  }

  clearCanvas() {
    this.allStrokes = [];
    this.redoStack = [];
  }

  saveSVG() {
    this.svgService.saveSVG(this.svgElement.nativeElement);
  }

  async sendToApi() {
    if (this.isSending) return;

    this.isSending = true;

    try {
      const data = await this.svgService.sendToApi(this.svgElement.nativeElement);
      console.log('SVG sent successfully:', data);
    } catch (error) {
      console.error('Error sending SVG to API:', error);
    } finally {
      this.isSending = false;
    }
  }

  // --- SVG IMPORT LOGIC ---

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      await this.loadSVGFile(input.files[0]);
      input.value = ''; // Reset to allow re-importing same file
    }
  }

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  @HostListener('drop', ['$event'])
  async onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
        await this.loadSVGFile(file);
      }
    }
  }

  private async loadSVGFile(file: File) {
    try {
      const svgContent = await this.svgService.loadSVGFile(file);
      this.loadSVGContent(svgContent);
    } catch (error) {
      console.error('Error loading SVG file:', error);
    }
  }

  // --- CORE DRAWING LOGIC ---

  onPointerDown(e: PointerEvent) {
    if (this.activeTool === 'eraser') {
      this.erase(e);
      return;
    }
    const { x, y } = this.getCoords(e);
    this.currentPoints = [[x, y, e.pressure]];
    this.redoStack = [];
  }

  onPointerMove(e: PointerEvent) {
    if (e.buttons !== 1) return;
    if (this.activeTool === 'eraser') {
      this.erase(e);
      return;
    }
    const { x, y } = this.getCoords(e);
    this.currentPoints = [...this.currentPoints, [x, y, e.pressure]];
    this.previewPath = this.drawingService.generatePreviewPath(
      this.currentPoints,
      this.tools[this.activeTool] as ToolConfig
    );
  }

  onPointerUp() {
    if (this.currentPoints.length > 0 && this.activeTool !== 'eraser') {
      const t = this.tools[this.activeTool] as ToolConfig;
      this.allStrokes.push({
        points: [...this.currentPoints],
        path: this.previewPath,
        color: t.color,
        opacity: t.opacity,
        outlineColor: t.outline.color,
        outlineWidth: t.outline.width,
      });
    }
    this.currentPoints = [];
    this.previewPath = '';
  }

  private erase(e: PointerEvent) {
    const { x, y } = this.getCoords(e);
    this.allStrokes = this.allStrokes.filter(
      (s) => !this.drawingService.shouldEraseStroke(s, x, y, this.tools.eraser.size)
    );
  }

  private getCoords(e: PointerEvent) {
    const rect = this.svgElement.nativeElement.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
}
