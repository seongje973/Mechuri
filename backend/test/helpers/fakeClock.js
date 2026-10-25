// RoomSession 테스트용 시계. advance(ms)로 시간을 흘려 타이머를 실행한다.
const createFakeClock = (start = 1_000_000) => {
  let now = start;
  let nextId = 1;
  const timers = new Map();
  const clock = {
    now: () => now,
    setTimeout: (fn, ms) => {
      const id = nextId++;
      timers.set(id, { at: now + ms, fn });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
    advance: (ms) => {
      const target = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!due) break;
        timers.delete(due[0]);
        now = due[1].at;
        due[1].fn();
      }
      now = target;
    },
    pending: () => timers.size
  };
  return clock;
};

module.exports = { createFakeClock };
