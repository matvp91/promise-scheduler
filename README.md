# promise-scheduler

Run async code in a synchronous order by scheduling promises, with the possibility to cancel pending or active tasks. Optimized for the browser environment.

I came across a situation where I needed more fine-grained control over a sequence of async operations, with the added requirement that a single operational task should be abortable. Meaning that the task could abort earlier on in its execution in order for the next task to run. Think of a `fetch` call with an `AbortController` that makes the `Promise` resolve earlier due to the fact that the signal is cancelled along the way, but then in a sequence of multiple fetch calls.

A lot of the existing solutions do not take abortable operations into account, and they do too much for my liking (such as allowing concurrency). This is a lightweight yet limited implementation of a scheduler able to execute async code one after another.

## API

```javascript
import Scheduler from '@matvp91/promise-scheduler';

const scheduler = new Scheduler();

function createTask() {
  // Dummy function to define performing work over time.
  const work = () => new Promise(resolve => setTimeout(resolve, 500));
  
  return async (throwIfCanceled) => {
    await work();
    throwIfCanceled(); // Checks whether we can continue or discard the callstack below.
    await work();
    throwIfCanceled();
  };
}

// Schedule a task.
scheduler.scheduleCallback(createTask());

// Schedule a task with notifiers.
scheduler.scheduleCallback(createTask(), {
  onError: (error) => {}, // The task causes an error.
  onAborted: () => {}, // The task got aborted working.
});

// Pending (future) tasks are cancelled, and if a task
// is actively working, it gets aborted.
scheduler.flushWork();

// Returns a promise when no more work is pending.
scheduler.waitForIdle(): Promise
```

## Lifecycle example

The example below illustrates a minimalistic Instance class with a load, unload and destroy lifecycle. The fact that the methods are async poses no risk of an unexpected side effect or race condition due to the fact that they're handled by a scheduler taking care of the order of execution.

```javascript
class Instance {
  load() {
    this.unload();
    scheduler.scheduleCallback(/* an async, abortable task with plenty of work */);
  }
  
  unload() {
    scheduler.flushWork();
    scheduler.scheduleCallback(/* an async task for cleanup */);
  }
  
  async destroy() {
    this.unload();
    await scheduler.waitForIdle(); // Ensures no pending work is left.
  }
}
```
