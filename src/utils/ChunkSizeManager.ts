import { AdaptiveChunkSizingOptions, ChunkSizeMetrics } from "../types";
import { AdaptiveChunkSizer } from "./AdaptiveChunkSizer";

class ChunkSizeManager {
  private adaptiveChunkSizer: AdaptiveChunkSizer | null = null;

  constructor(options: AdaptiveChunkSizingOptions | undefined) {
    if (options) {
      this.adaptiveChunkSizer = new AdaptiveChunkSizer(options);
    }
  }

  getChunkSize(): number {
    return this.adaptiveChunkSizer
      ? this.adaptiveChunkSizer.getChunkSize()
      : Infinity;
  }

  updateMetrics(metrics: ChunkSizeMetrics): void {
    if (this.adaptiveChunkSizer) {
      this.adaptiveChunkSizer.addMetrics(metrics);
    }
  }
}

export { ChunkSizeManager };
