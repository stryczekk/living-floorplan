// The back button (Android app, browser) closes our dialog instead of
// leaving the app. Opening a dialog pushes one history
// entry with the same URL; back pops it and onBack() closes the dialog
// (false = it only left full screen, the entry comes back). Closing with x
// or the backdrop pops our entry ourselves - no empty steps left behind.
// then(fn): what opens Home Assistant's own dialog right after ours waits
// for that pop, or it would take HA's fresh entry with it.
export function backCloses(key, onBack) {
  let token = null, pushed = false, backing = false, after = [], guard = null;
  const push = () => { history.pushState({ [key]: token }, ""); pushed = true; };
  const settle = () => {
    backing = false;
    clearTimeout(guard);
    if (token && !pushed) push();
    const fns = after; after = [];
    fns.forEach((fn) => fn());
  };
  window.addEventListener("popstate", () => {
    if (backing) { settle(); return; }
    if (!token || !pushed || (history.state && history.state[key] === token)) return;
    pushed = false;
    if (onBack() === false && token) push();
  });
  return {
    opened() {
      if (token) return;
      token = Math.random().toString(36).slice(2);
      if (!backing) push();
    },
    closed() {
      const t = token;
      token = null;
      if (!pushed) return;
      pushed = false;
      if (!history.state || history.state[key] !== t) return;
      backing = true;
      guard = setTimeout(settle, 600);
      history.back();
    },
    then(fn) { if (backing) after.push(fn); else fn(); },
  };
}
