/**
 * Default Sets have a size limit of 2**24 (~16 million), so we are using multiple
 */

class ChunkedSet<T extends unknown = unknown> {
  chunkSize: number;
  chunks: Set<T>[];

  constructor(chunkSize = 2 ** 24) {
    this.chunkSize = chunkSize; // Max number of items in one chunk
    this.chunks = [new Set()]; // Array of sets (chunks)
  }

  add(value: T): void {
    if (this.has(value)) return;
    if (this.chunks[this.chunks.length - 1]!.size >= this.chunkSize) {
      this.chunks.push(new Set());
    }
    this.chunks[this.chunks.length - 1]!.add(value);
  }

  has(value: T): boolean {
    return this.chunks.some((chunk) => chunk.has(value));
  }

  get size(): number {
    return this.chunks.reduce((total, chunk) => total + chunk.size, 0);
  }

  *values(): Generator<T, void, unknown> {
    for (const chunk of this.chunks) {
      yield* chunk;
    }
  }
}

export { ChunkedSet };
