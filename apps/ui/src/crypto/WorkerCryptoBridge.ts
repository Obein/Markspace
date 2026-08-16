import { WorkerCryptoRequest, WorkerCryptoResponse } from './crypto.worker';

export class WorkerCryptoBridge {
  private static worker: Worker | null = null;
  private static pendingTasks = new Map<
    string,
    { resolve: (val: any) => void; reject: (err: Error) => void }
  >();

  private static getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./crypto.worker.ts', import.meta.url), {
        type: 'module',
      });

      this.worker.onmessage = (e: MessageEvent<WorkerCryptoResponse>) => {
        const { taskId, success, result, error } = e.data;
        const task = this.pendingTasks.get(taskId);
        if (task) {
          this.pendingTasks.delete(taskId);
          if (success) {
            task.resolve(result);
          } else {
            task.reject(new Error(error || 'Worker cryptographic task failed'));
          }
        }
      };
    }
    return this.worker;
  }

  public static async executeTask<T>(
    type: WorkerCryptoRequest['type'],
    payload: any,
    transferables: Transferable[] = []
  ): Promise<T> {
    const worker = this.getWorker();
    const taskId = `task_${Date.now()}_${Math.random()}`;

    return new Promise<T>((resolve, reject) => {
      this.pendingTasks.set(taskId, { resolve, reject });
      worker.postMessage({ taskId, type, payload } as WorkerCryptoRequest, transferables);
    });
  }

  public static terminateWorker(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.pendingTasks.clear();
    }
  }
}
