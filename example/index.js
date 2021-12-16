import Scheduler from "../src";

const scheduler = new Scheduler();

let idx_ = 0;

const work = () => new Promise((resolve) => setTimeout(resolve, 1000));

const createTask = (name) => {
  const idx = idx_++;
  return async (throwIfCanceled) => {
    console.log(`${idx} ${name} start`);
    await work();
    throwIfCanceled();
    await work();
    throwIfCanceled();
    await work();
    throwIfCanceled();
    if (name === "load") throw new Error("Failed");
    console.log(`${idx} ${name} stop`);
  };
};

const unload = () => {
  scheduler.flushWork();
  scheduler.scheduleCallback(createTask("unload"));
};

const load = () => {
  unload();
  scheduler.scheduleCallback(createTask("load"), {
    onError: (error) => console.error(error),
    onAborted: () => console.log("aborted"),
  });
};

load();
load();
setTimeout(() => {
  load();
  setTimeout(() => {
    unload();
    load();
  }, 300);
}, 100);

scheduler.waitForIdle().then(() => {
  console.log("HELLO");
});
