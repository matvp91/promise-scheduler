export class Emitter {
  listeners_ = [];

  emit_(name) {
    let listener;
    while ((listener = this.listeners_.shift())) {
      if (listener.name === name) {
        listener.callback();
      }
    }
  }

  once(name, callback) {
    this.listeners_.push({
      name,
      callback,
    });
  }
}
