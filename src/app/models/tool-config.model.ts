export interface ToolConfig {
  color: string;
  size: number;
  opacity: number;
  thinning: number;
  streamline: number;
  smoothing: number;
  easing: string;
  start: {
    taper: number;
    easing: string;
  };
  end: {
    taper: number;
    easing: string;
  };
  outline: {
    color: string;
    width: number;
  };
}

export interface EraserConfig {
  size: number;
}
