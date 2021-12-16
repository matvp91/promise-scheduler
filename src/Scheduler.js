import { Emitter } from "./Emitter";

const abortSymbol = Symbol("abortTask");

class Task {
  canceled_ = false;

  constructor(run, onFail) {
    this.run_ = run;
    this.onFail_ = onFail;
  }

  cancel() {
    if (this.canceled_) {
      return;
    }
    this.canceled_ = true;
  }

  run() {
    if (this.canceled_) {
      return Promise.resolve();
    }

    const throwIfCanceled = () => this.throwIfCanceled_();

    const onException = (error) => {
      this.onFail_({
        canceled: this.canceled_,
        aborted: error === abortSymbol,
        error,
      });
    };

    return this.run_(throwIfCanceled).catch(onException);
  }

  throwIfCanceled_() {
    if (this.canceled_) {
      throw abortSymbol;
    }
  }
}

class Queue extends Emitter {
  queue_ = [];

  workingTask_ = null;

  isWorking = () => !!this.workingTask_;

  enqueue(task) {
    this.queue_.push(task);
    this.dequeue();
  }

  dequeue() {
    if (this.workingTask_) {
      return;
    }

    const task = this.queue_.shift();
    if (!task) {
      this.emit_("finished");
      return;
    }

    this.workingTask_ = task;

    task.run().then(() => {
      this.workingTask_ = null;
      this.dequeue();
    });
  }

  flush() {
    this.workingTask_?.cancel();
    if (this.queue_.length) {
      this.queue_ = [];
    }
  }
}

export class Scheduler {
  queue_ = new Queue();

  scheduleCallback(run, { onError, onAborted } = {}) {
    const task = new Task(run, ({ canceled, aborted, error }) => {
      // An error occured between the time it was given a
      // cancel and the actual cancelation.
      if (canceled) {
        return;
      }

      // The task got aborted, the error is irrelevant.
      if (aborted) {
        onAborted?.();
      }
      // An unexpected error occured.
      else {
        onError?.(error);
      }
    });
    this.queue_.enqueue(task);
  }

  flushWork() {
    this.queue_.flush();
  }

  waitForIdle() {
    return new Promise((resolve) => {
      if (!this.queue_.isWorking()) {
        resolve();
      } else {
        this.queue_.once("finished", resolve);
      }
    });
  }
}
