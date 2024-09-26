export class PathTrie {
  private children: Map<string, PathTrie>;
  private isEndOfPath: boolean;

  constructor() {
    this.children = new Map();
    this.isEndOfPath = false;
  }

  addPath(path: string[]): void {
    let node: PathTrie = this;
    for (const segment of path) {
      if (!node.children.has(segment)) {
        node.children.set(segment, new PathTrie());
      }
      node = node.children.get(segment)!;
    }
    node.isEndOfPath = true;
  }

  hasPath(path: string[]): boolean {
    let node: PathTrie = this;
    for (const segment of path) {
      if (!node.children.has(segment)) {
        return false;
      }
      node = node.children.get(segment)!;
    }
    return node.isEndOfPath;
  }

  hasPrefix(path: string[]): boolean {
    let node: PathTrie = this;
    for (const segment of path) {
      if (!node.children.has(segment)) {
        return false;
      }
      node = node.children.get(segment)!;
      if (node.isEndOfPath) {
        return true;
      }
    }
    return false;
  }

  getAllPaths(): string[][] {
    const results: string[][] = [];
    this.getAllPathsHelper([], results);
    return results;
  }

  private getAllPathsHelper(currentPath: string[], results: string[][]): void {
    if (this.isEndOfPath) {
      results.push([...currentPath]);
    }
    for (const [segment, child] of this.children) {
      currentPath.push(segment);
      child.getAllPathsHelper(currentPath, results);
      currentPath.pop();
    }
  }

  clear(): void {
    this.children.clear();
    this.isEndOfPath = false;
  }

  size(): number {
    let count = 0;
    if (this.isEndOfPath) {
      count++;
    }
    for (const child of this.children.values()) {
      count += child.size();
    }
    return count;
  }

  toString(): string {
    return JSON.stringify(this.toObject(), null, 2);
  }

  private toObject(): any {
    const obj: any = {};
    if (this.isEndOfPath) {
      obj.isEndOfPath = true;
    }
    for (const [segment, child] of this.children) {
      obj[segment] = child.toObject();
    }
    return obj;
  }
}
