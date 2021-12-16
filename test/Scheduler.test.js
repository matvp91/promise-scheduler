import { Scheduler } from "../src/Scheduler";

const work = () => new Promise((resolve) => setTimeout(resolve, 100));

const createRun = (callback) =>
  jest.fn(async (throwIfCanceled) => {
    await work();
    await callback?.(throwIfCanceled);
  });

describe("Scheduler", () => {
  let scheduler;

  beforeEach(() => {
    scheduler = new Scheduler();
  });

  test("Schedule callback", async () => {
    const run = createRun();
    scheduler.scheduleCallback(run);

    await scheduler.waitForIdle();

    expect(run).toHaveBeenCalledWith(expect.any(Function));
    expect(run).toHaveBeenCalledTimes(1);
  });

  test("Schedules multiple callbacks", async () => {
    const run1 = createRun();
    const run2 = createRun();

    scheduler.scheduleCallback(run1);
    scheduler.scheduleCallback(run2);

    await scheduler.waitForIdle();

    expect(run1).toHaveBeenCalledWith(expect.any(Function));
    expect(run2).toHaveBeenCalledWith(expect.any(Function));
  });

  test("Cancels a callback and continues work", async () => {
    const run1 = createRun((throwIfCanceled) => {
      throwIfCanceled();
    });
    const onRun1Aborted = jest.fn();

    const run2 = createRun();
    const onRun2Aborted = jest.fn();

    scheduler.scheduleCallback(run1, {
      onAborted: onRun1Aborted,
    });
    setTimeout(() => {
      scheduler.flushWork();
      scheduler.scheduleCallback(run2, {
        onAborted: onRun2Aborted,
      });
    }, 50);

    await scheduler.waitForIdle();

    expect(onRun1Aborted).toHaveBeenCalledTimes(1);
    expect(onRun2Aborted).not.toHaveBeenCalled();
  });

  test("Resolves idle promise if no work is pending and not working", async () => {
    await expect(scheduler.waitForIdle()).resolves;
  });
});
