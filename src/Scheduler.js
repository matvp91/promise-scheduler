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
        // The task is cancelled but an error is thrown anyways.
        canceled: this.canceled_,
        // The task is cancelled and the callstack is discarded.
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

    // Attempt to start working immediately.
    this.dequeue();
  }

  dequeue() {
    if (this.workingTask_) {
      return;
    }

    // Get the next task and remove it from the queue.
    const task = this.queue_.shift();
    if (!task) {
      this.emit_("finished");
      return;
    }

    this.workingTask_ = task;

    const completeWork = () => {
      this.workingTask_ = null;
      this.dequeue();
    };

    // The return value of a task run should not be
    // async by definition, it might aswell be sync, or undefined.
    const value = task.run();
    if (value instanceof Promise) {
      value.then(completeWork);
    } else {
      completeWork();
    }
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
      // The task got aborted, the error is irrelevant but
      // report to the callback.
      if (aborted) {
        onAborted?.();
        return;
      }

      // An error occured between the time it was given a
      // cancel and the actual cancelation.
      if (canceled) {
        return;
      }

      // An unexpected error occured.
      onError?.(error);
    });
    this.queue_.enqueue(task);
  }

  /**
   * Cancels the executing task and discard all pending tasks.
   */
  flushWork() {
    this.queue_.flush();
  }

  /**
   * Will resolve when in idle, meaning no task is executing or pending.
   * @returns Promise
   */
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
