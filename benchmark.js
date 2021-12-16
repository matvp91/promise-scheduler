const b = require("benny");
const { default: Scheduler } = require("./dist");

const scheduler = new Scheduler();

b.suite(
  "promise-scheduler",

  b.add("Execute task", async () => {
    scheduler.scheduleCallback(() => Promise.resolve());
    await scheduler.waitForIdle();
  }),

  b.cycle(),
  b.complete()
);
