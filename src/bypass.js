import { AsyncLocalStorage } from 'node:async_hooks';

export class StreamBypass {
  constructor() { this.context = new AsyncLocalStorage(); }
  get active() { return this.context.getStore() === true; }
  async *stream(dispatch, request) {
    const iterator = this.context.run(true, () => dispatch(request)[Symbol.asyncIterator]());
    try {
      while (true) { const result = await this.context.run(true, () => iterator.next()); if (result.done) return; yield result.value; }
    } finally { if (iterator.return) await this.context.run(true, () => iterator.return()); }
  }
}
