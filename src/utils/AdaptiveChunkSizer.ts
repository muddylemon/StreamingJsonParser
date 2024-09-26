import { AdaptiveChunkSizingOptions, ChunkSizeMetrics } from '../types';

export class AdaptiveChunkSizer {
    private chunkSize: number;
    private readonly minChunkSize: number;
    private readonly maxChunkSize: number;
    private readonly targetProcessingTime: number;
    private metrics: ChunkSizeMetrics[] = [];

    constructor(options: AdaptiveChunkSizingOptions) {
        this.chunkSize = options.initialChunkSize;
        this.minChunkSize = options.minChunkSize;
        this.maxChunkSize = options.maxChunkSize;
        this.targetProcessingTime = options.targetProcessingTime;
    }

    addMetrics(metrics: ChunkSizeMetrics): void {
        this.metrics.push(metrics);
        if (this.metrics.length > 10) {
            this.metrics.shift();
        }
        this.adjustChunkSize();
    }

    private adjustChunkSize(): void {
        if (this.metrics.length < 5) return;

        const avgProcessingTime = this.metrics.reduce((sum, m) => sum + m.processingTime, 0) / this.metrics.length;
        const avgComplexity = this.metrics.reduce((sum, m) => sum + m.complexity, 0) / this.metrics.length;

        if (avgProcessingTime > this.targetProcessingTime * 1.2) {
            this.chunkSize = Math.max(this.minChunkSize, this.chunkSize * 0.8);
        } else if (avgProcessingTime < this.targetProcessingTime * 0.8) {
            this.chunkSize = Math.min(this.maxChunkSize, this.chunkSize * 1.2);
        }

        // Further adjust based on complexity
        if (avgComplexity > 0.7) {
            this.chunkSize = Math.max(this.minChunkSize, this.chunkSize * 0.9);
        } else if (avgComplexity < 0.3) {
            this.chunkSize = Math.min(this.maxChunkSize, this.chunkSize * 1.1);
        }
    }

    getChunkSize(): number {
        return Math.round(this.chunkSize);
    }
}