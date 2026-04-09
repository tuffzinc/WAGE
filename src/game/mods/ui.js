(() => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const __modHookStore = {
    before: new Map(),
    during: new Map(),
    after: new Map()
  };
  const __namedActions = new Map();
  const __attemptState = {
    count: 1
  };

  function __unitToMs(unitRaw) {
    const unit = String(unitRaw || "").toLowerCase();
    if (unit.startsWith("hour")) {
      return 60 * 60 * 1000;
    }
    if (unit.startsWith("minute")) {
      return 60 * 1000;
    }
    if (unit.startsWith("second")) {
      return 1000;
    }
    return 1;
  }

  function __parsePathDelay(pathRaw) {
    const path = String(pathRaw || "");
    const m = path.match(/^(.*)\.for\.(\d+)\.(milliseconds?|seconds?|minutes?|hours?)$/i);
    if (!m) {
      return {
        path,
        delayMs: 0
      };
    }
    return {
      path: m[1],
      delayMs: (parseInt(m[2], 10) || 0) * __unitToMs(m[3])
    };
  }

  function __ensureHookSet(phase, path) {
    const store = __modHookStore[phase];
    if (!store.has(path)) {
      store.set(path, new Set());
    }
    return store.get(path);
  }

  function __hookOn(phase, path, fn) {
    if (typeof fn !== "function") {
      return () => {};
    }
    const set = __ensureHookSet(phase, path);
    set.add(fn);
    return () => __hookOff(phase, path, fn);
  }

  function __hookOnce(phase, path, fn) {
    if (typeof fn !== "function") {
      return () => {};
    }
    const off = __hookOn(phase, path, payload => {
      off();
      fn(payload);
    });
    return off;
  }

  function __hookOff(phase, path, fn) {
    const set = __modHookStore[phase].get(path);
    if (!set) {
      return;
    }
    set.delete(fn);
  }

  function __hookEmit(phase, path, payload) {
    if (phase === "after" && (path === "game.start" || path === "level.restart")) {
      const attemptMaybe = payload && payload.attempt;
      if (Number.isFinite(attemptMaybe)) {
        __attemptState.count = attemptMaybe;
      }
    }
    const set = __modHookStore[phase].get(path);
    if (!set || set.size < 1) {
      return;
    }
    for (const fn of Array.from(set)) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`mod hook error (${phase}.${path})`, err);
      }
    }
  }

  function __parseXYFromAnimationSpec(spec) {
    const text = String(spec || "");
    const m = text.match(/X(-?\d+)_Y(-?\d+)/i);
    if (!m) {
      return null;
    }
    return {
      x: parseInt(m[1], 10),
      y: parseInt(m[2], 10)
    };
  }

  function __hookShowImage(path, options = {}) {
    if (!path) {
      return;
    }
    const animation = String(options.animation || "").toLowerCase();
    const xy = __parseXYFromAnimationSpec(animation);
    const durationMs = Number.isFinite(options.durationMs) ? Math.max(120, options.durationMs) : 1400;

    const img = document.createElement("img");
    img.src = String(path);
    img.alt = options.alt || "mod-image";
    img.style.position = "fixed";
    img.style.zIndex = "100001";
    img.style.pointerEvents = "none";
    img.style.maxWidth = options.maxWidth || "40vw";
    img.style.maxHeight = options.maxHeight || "40vh";
    img.style.opacity = "0";
    img.style.left = "50%";
    img.style.top = "50%";
    img.style.transform = "translate(-50%, -50%)";
    img.style.transition = "opacity 240ms ease, transform 420ms cubic-bezier(0.22, 1, 0.36, 1)";

    if (xy) {
      img.style.left = `${xy.x}px`;
      img.style.top = `${xy.y}px`;
      img.style.transform = "translate(0, 0)";
    }

    const fromUp = animation.includes("from up");
    const bounce = animation.includes("bounce");

    if (fromUp) {
      img.style.transform = xy ? "translate(0, -120vh)" : "translate(-50%, -120vh)";
    }

    document.body.appendChild(img);

    requestAnimationFrame(() => {
      img.style.opacity = "1";
      if (fromUp) {
        img.style.transform = xy ? "translate(0, 0)" : "translate(-50%, -50%)";
      }
      if (bounce) {
        img.animate([
          {
            transform: img.style.transform
          },
          {
            transform: (xy ? "translate(0, 0)" : "translate(-50%, -50%)") + " scale(1.12)"
          },
          {
            transform: xy ? "translate(0, 0)" : "translate(-50%, -50%)"
          }
        ], {
          duration: 420,
          easing: "cubic-bezier(0.34, 1.56, 0.64, 1)"
        });
      }
    });

    window.setTimeout(() => {
      img.style.opacity = "0";
      window.setTimeout(() => {
        if (img.parentNode) {
          img.parentNode.removeChild(img);
        }
      }, 280);
    }, durationMs);
  }

  function __hookRegisterImageHelper(phase, path, options = {}) {
    const settings = typeof options === "string" ? {
      path: options
    } : options || {};
    const imagePath = settings.path;
    return __hookOn(phase, path, () => __hookShowImage(imagePath, settings));
  }

  const __pressedKeys = new Map();
  const __inputFiredState = new Map();

  function __normalizeKeyName(key) {
    return String(key || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/^arrow/, "arrow");
  }

  function __parseHoldToken(tokenRaw) {
    const token = String(tokenRaw || "").toLowerCase();
    const m = token.match(/^([a-z0-9]+?)h(mi|m|h)?(\d+)$/);
    if (!m) {
      return {
        key: token,
        holdMs: 0
      };
    }
    const baseKey = m[1];
    const unit = m[2] || "";
    const value = parseInt(m[3], 10) || 0;
    let holdMs = value * 1000;
    if (unit === "m") {
      holdMs = value;
    } else if (unit === "mi") {
      holdMs = value * 60 * 1000;
    } else if (unit === "h") {
      holdMs = value * 60 * 60 * 1000;
    }
    return {
      key: baseKey,
      holdMs
    };
  }

  function __evaluateKeyPath(path, nowMs) {
    if (!path.startsWith("key.")) {
      return false;
    }
    const expr = path.slice(4).replace(/\.and\.key\./g, ".and.").replace(/\.and\.key/g, ".and.");
    const tokens = expr.split(".and.");
    for (let i = 0; i < tokens.length; i++) {
      const parsed = __parseHoldToken(tokens[i]);
      const downAt = __pressedKeys.get(parsed.key);
      if (!downAt) {
        return false;
      }
      if (parsed.holdMs > 0 && nowMs - downAt < parsed.holdMs) {
        return false;
      }
    }
    return true;
  }

  function __triggerInputHooks(kind, nowMs, payload) {
    const phases = ["before", "during", "after"];
    for (let pi = 0; pi < phases.length; pi++) {
      const phase = phases[pi];
      const store = __modHookStore[phase];
      for (const path of store.keys()) {
        if (!path.startsWith(kind + ".")) {
          continue;
        }
        let matched = false;
        if (kind === "key") {
          matched = __evaluateKeyPath(path, nowMs);
        } else if (kind === "mouse") {
          matched = payload && payload.path === path;
        }
        if (kind === "mouse") {
          if (matched) {
            __hookEmit(phase, path, payload);
          }
          continue;
        }
        const firedKey = `${phase}:${path}`;
        const wasFired = !!__inputFiredState.get(firedKey);
        if (matched && !wasFired) {
          __hookEmit(phase, path, payload);
          __inputFiredState.set(firedKey, true);
        } else if (!matched && wasFired) {
          __inputFiredState.set(firedKey, false);
        }
      }
    }
  }

  function __escapeCssIdent(value) {
    const raw = String(value || "");
    if (typeof CSS !== "undefined" && CSS && typeof CSS.escape === "function") {
      return CSS.escape(raw);
    }
    return raw.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function __uiElementsByName(uiName) {
    const raw = String(uiName || "").trim();
    if (!raw) {
      return [];
    }
    const name = raw.replace(/^[#.]/, "");
    const out = [];
    const seen = new Set();
    const pushUnique = node => {
      if (!node || seen.has(node)) {
        return;
      }
      seen.add(node);
      out.push(node);
    };

    const byId = document.getElementById(name);
    if (byId) {
      pushUnique(byId);
    }

    const byClass = document.querySelectorAll("." + __escapeCssIdent(name));
    for (let i = 0; i < byClass.length; i++) {
      pushUnique(byClass[i]);
    }
    return out;
  }

  function __resolveEasing(type, direction) {
    const t = String(type || "ease").toLowerCase();
    const d = String(direction || "out").toLowerCase().replace(/\s+/g, "");
    const key = d === "inout" ? "inout" : d;
    const map = {
      ease: {
        in: "ease-in",
        out: "ease-out",
        inout: "ease-in-out"
      },
      sine: {
        in: "cubic-bezier(0.47, 0, 0.745, 0.715)",
        out: "cubic-bezier(0.39, 0.575, 0.565, 1)",
        inout: "cubic-bezier(0.445, 0.05, 0.55, 0.95)"
      },
      back: {
        in: "cubic-bezier(0.36, 0, 0.66, -0.56)",
        out: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        inout: "cubic-bezier(0.68, -0.6, 0.32, 1.6)"
      },
      elastic: {
        in: "cubic-bezier(0.7, -0.75, 0.9, 0.25)",
        out: "cubic-bezier(0.2, 1.4, 0.2, 1)",
        inout: "cubic-bezier(0.68, -0.8, 0.32, 1.8)"
      },
      bounce: {
        in: "cubic-bezier(0.6, -0.28, 0.74, 0.05)",
        out: "cubic-bezier(0.17, 0.89, 0.32, 1.27)",
        inout: "cubic-bezier(0.5, -0.3, 0.5, 1.3)"
      },
      exponential: {
        in: "cubic-bezier(0.95, 0.05, 0.795, 0.035)",
        out: "cubic-bezier(0.19, 1, 0.22, 1)",
        inout: "cubic-bezier(1, 0, 0, 1)"
      }
    };
    const bucket = map[t] || map.ease;
    return bucket[key] || bucket.out;
  }

  function __applyUIPlacement(node) {
    if (!node || !node.classList) {
      return;
    }
    node.style.position = "fixed";
    node.style.zIndex = "100050";
    node.style.maxWidth = node.style.maxWidth || "90vw";
    node.style.maxHeight = node.style.maxHeight || "90vh";
    node.style.overflow = node.style.overflow || "auto";
    node.style.margin = "0";
    node.style.pointerEvents = node.style.pointerEvents || "auto";
    node.style.left = "";
    node.style.right = "";
    node.style.top = "";
    node.style.bottom = "";
    node.style.transform = "";

    if (node.classList.contains("ic")) {
      node.style.left = "50%";
      node.style.top = "50%";
      node.style.transform = "translate(-50%, -50%)";
      return;
    }
    if (node.classList.contains("il")) {
      node.style.left = "20px";
      node.style.top = "50%";
      node.style.transform = "translate(0, -50%)";
      return;
    }
    if (node.classList.contains("ir")) {
      node.style.right = "20px";
      node.style.top = "50%";
      node.style.transform = "translate(0, -50%)";
      return;
    }
    if (node.classList.contains("sl")) {
      node.style.left = "0";
      node.style.top = "50%";
      node.style.transform = "translate(-105%, -50%)";
      return;
    }
    if (node.classList.contains("sr")) {
      node.style.right = "0";
      node.style.top = "50%";
      node.style.transform = "translate(105%, -50%)";
      return;
    }

    node.style.left = "50%";
    node.style.top = "50%";
    node.style.transform = "translate(-50%, -50%)";
  }

  function __makeAnimTransform(animation, fallbackTransform) {
    const from = String(animation && animation.from || "").toLowerCase();
    const to = String(animation && animation.to || "").toLowerCase();
    const base = fallbackTransform || "translate(-50%, -50%)";
    const pointToOffset = (token, magnitudeVw, magnitudeVh) => {
      const t = String(token || "center").toLowerCase();
      const hasLeft = t.includes("left");
      const hasRight = t.includes("right");
      const hasTop = t.includes("top") || t.includes("up");
      const hasBottom = t.includes("bottom") || t.includes("down");
      const x = hasLeft ? -magnitudeVw : hasRight ? magnitudeVw : 0;
      const y = hasTop ? -magnitudeVh : hasBottom ? magnitudeVh : 0;
      return {
        x,
        y
      };
    };
    const fromPoint = pointToOffset(from, 140, 140);
    const toPoint = pointToOffset(to, 45, 45);
    const fromOffset = `translate3d(${fromPoint.x}vw, ${fromPoint.y}vh, 0)`;
    const toOffset = `translate3d(${toPoint.x}vw, ${toPoint.y}vh, 0)`;
    return {
      from: `${base} ${fromOffset}`,
      to: `${base} ${toOffset}`,
      base
    };
  }

  function __showUI(uiClassName, activation = null) {
    const nodes = __uiElementsByName(uiClassName);
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      __applyUIPlacement(node);
      node.style.display = "";
      node.setAttribute("data-ui-open", "1");
      const anim = activation && activation.animation;
      if (anim) {
        const resolved = __makeAnimTransform(anim, node.style.transform || "translate(-50%, -50%)");
        node.style.opacity = "0";
        node.style.transform = resolved.from;
        requestAnimationFrame(() => {
          const totalMs = Math.max(120, anim.durationMs || 520);
          node.style.transition = `transform ${totalMs}ms ${__resolveEasing(anim.easeType, anim.easeDirection)}, opacity 180ms ease`;
          node.style.transform = resolved.to;
          node.style.opacity = "1";
        });
      }
    }
  }

  function __hideUI(uiClassName) {
    const nodes = __uiElementsByName(uiClassName);
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].style.display = "none";
      nodes[i].setAttribute("data-ui-open", "0");
    }
  }

  function __normalizeClassColonAttributes(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const visit = node => {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }
      const classColon = node.getAttribute("class:");
      if (classColon) {
        node.setAttribute("class", ((node.getAttribute("class") || "") + " " + classColon).trim());
        node.removeAttribute("class:");
      }
      const children = node.children || [];
      for (let i = 0; i < children.length; i++) {
        visit(children[i]);
      }
    };
    visit(root);
  }

  function __toggleUI(uiClassName) {
    const nodes = __uiElementsByName(uiClassName);
    if (nodes.length < 1) {
      return;
    }
    const visible = nodes.some(node => getComputedStyle(node).display !== "none");
    if (visible) {
      __hideUI(uiClassName);
    } else {
      __showUI(uiClassName);
    }
  }

  function __bindUIToHook(phase, path, uiClassName, action = "toggle") {
    const mode = String(action || "toggle").toLowerCase();
    return __hookOn(phase, path, () => {
      if (mode === "show") {
        __showUI(uiClassName);
      } else if (mode === "hide") {
        __hideUI(uiClassName);
      } else {
        __toggleUI(uiClassName);
      }
    });
  }

  function __isActivationObject(value) {
    return !!(value && typeof value === "object" && value.__gdActivateType);
  }

  function __normalizeFunModKey(raw) {
    const key = String(raw || "").toLowerCase();
    if (key === "platformer") {
      return "platformerTest";
    }
    return key;
  }

  function __setModEnabled(modName, enabled) {
    const key = __normalizeFunModKey(modName);
    const next = getFunToggles();
    if (!(key in next)) {
      return;
    }
    next[key] = !!enabled;
    setFunToggles(next);
  }

  function __resolveNamedActivation(name) {
    return __namedActions.get(String(name || "")) || null;
  }

  function __makeUiAction(uiClassName, mode = "toggle") {
    return {
      __gdActivateType: "ui",
      uiClassName: String(uiClassName || ""),
      mode: String(mode || "toggle"),
      animation: {
        from: "center",
        to: "center",
        easeType: "ease",
        easeDirection: "out",
        durationMs: 520
      },
      durationMs: 0,
      thenAction: null,
      extraActions: []
    };
  }

  function __makeModAction(modName, enabled = true) {
    return {
      __gdActivateType: "mod",
      modName: String(modName || ""),
      enabled: !!enabled,
      durationMs: 0,
      thenAction: null,
      extraActions: []
    };
  }

  function __appendExtraAction(target, action) {
    if (!__isActivationObject(action)) {
      return;
    }
    if (!Array.isArray(target.extraActions)) {
      target.extraActions = [];
    }
    target.extraActions.push(action);
  }

  function __runExtraActions(activation) {
    if (!activation || !Array.isArray(activation.extraActions) || activation.extraActions.length < 1) {
      return;
    }
    for (let i = 0; i < activation.extraActions.length; i++) {
      __runActivation(activation.extraActions[i]);
    }
  }

  function __runActivation(activation) {
    if (!__isActivationObject(activation)) {
      return;
    }
    if (activation.__gdActivateType === "named") {
      const resolved = __resolveNamedActivation(activation.actionName);
      if (resolved) {
        __runActivation(resolved);
      }
      return;
    }

    if (activation.__gdActivateType === "ui") {
      const mode = activation.mode || "toggle";
      if (mode === "show") {
        __showUI(activation.uiClassName, activation);
      } else if (mode === "hide") {
        __hideUI(activation.uiClassName);
      } else {
        __toggleUI(activation.uiClassName);
      }
      __runExtraActions(activation);
      if (activation.durationMs && activation.durationMs > 0 && mode !== "hide") {
        window.setTimeout(() => __hideUI(activation.uiClassName), activation.durationMs);
      }
      if (activation.thenAction) {
        const thenDelay = activation.durationMs && activation.durationMs > 0 ? activation.durationMs : 0;
        window.setTimeout(() => __runActivation(activation.thenAction), thenDelay);
      }
      return;
    }

    if (activation.__gdActivateType === "mod") {
      __setModEnabled(activation.modName, activation.enabled);
      __runExtraActions(activation);
      if (activation.durationMs && activation.durationMs > 0) {
        window.setTimeout(() => __setModEnabled(activation.modName, !activation.enabled), activation.durationMs);
      }
      if (activation.thenAction) {
        const thenDelay = activation.durationMs && activation.durationMs > 0 ? activation.durationMs : 0;
        window.setTimeout(() => __runActivation(activation.thenAction), thenDelay);
      }
    }
  }

  function __makeThenBuilder(target, baseFactory) {
    return new Proxy({}, {
      get(_obj, prop) {
        const word = String(prop).toLowerCase();
        if (word === "activate") {
          return value => {
            if (__isActivationObject(value)) {
              target.thenAction = value;
            } else {
              target.thenAction = {
                __gdActivateType: "named",
                actionName: String(value || "")
              };
            }
            return baseFactory(target, "root");
          };
        }
        if (word === "enable") {
          return {
            mod: new Proxy({}, {
              get(_m, modName) {
                target.thenAction = {
                  __gdActivateType: "mod",
                  modName: String(modName),
                  enabled: true
                };
                return baseFactory(target, "root");
              }
            })
          };
        }
        if (word === "disable") {
          return {
            mod: new Proxy({}, {
              get(_m, modName) {
                target.thenAction = {
                  __gdActivateType: "mod",
                  modName: String(modName),
                  enabled: false
                };
                return baseFactory(target, "root");
              }
            })
          };
        }
        return baseFactory(target, "root");
      }
    });
  }

  function __makeDurationChain(target, baseFactory) {
    return new Proxy({}, {
      get(_obj, prop) {
        const word = String(prop).toLowerCase();
        if (/^\d+$/.test(word)) {
          const amount = parseInt(word, 10) || 0;
          return new Proxy({}, {
            get(_u, unitProp) {
              const unit = String(unitProp).toLowerCase();
              if (!["millisecond", "milliseconds", "second", "seconds", "minute", "minutes", "hour", "hours"].includes(unit)) {
                return baseFactory(target, "root");
              }
              target.durationMs = amount * __unitToMs(unit);
              return new Proxy({}, {
                get(_next, nextProp) {
                  if (String(nextProp).toLowerCase() === "then") {
                    return __makeThenBuilder(target, baseFactory);
                  }
                  return baseFactory(target, "root");
                }
              });
            }
          });
        }
        return baseFactory(target, "root");
      }
    });
  }

  function __makeAndActionBuilder(target, baseFactory) {
    const makeBranch = (uiMode, modEnabled) => {
      const fn = value => {
        if (__isActivationObject(value)) {
          __appendExtraAction(target, value);
        } else {
          __appendExtraAction(target, {
            __gdActivateType: "named",
            actionName: String(value || "")
          });
        }
        return baseFactory(target, "root");
      };
      fn.ui = uiClassName => {
        __appendExtraAction(target, __makeUiAction(uiClassName, uiMode));
        return baseFactory(target, "root");
      };
      fn.mod = new Proxy({}, {
        get(_m, modName) {
          __appendExtraAction(target, __makeModAction(modName, modEnabled));
          return baseFactory(target, "root");
        }
      });
      return fn;
    };
    return {
      activate: makeBranch("toggle", true),
      enable: makeBranch("show", true),
      disable: makeBranch("hide", false)
    };
  }

  function __applyActivationObject(phase, path, activation) {
    if (!__isActivationObject(activation)) {
      return false;
    }
    const parsed = __parsePathDelay(path);
    __hookOn(phase, parsed.path, () => {
      if (parsed.delayMs > 0) {
        window.setTimeout(() => __runActivation(activation), parsed.delayMs);
      } else {
        __runActivation(activation);
      }
    });
    return true;
  }

  function __makeHookPathProxy(phase, parts = []) {
    return new Proxy({}, {
      get(_target, prop) {
        if (prop === "phase") {
          return phase;
        }
        if (prop === "path") {
          return parts.join(".");
        }
        if (prop === "on") {
          return fn => __hookOn(phase, parts.join("."), fn);
        }
        if (prop === "once") {
          return fn => __hookOnce(phase, parts.join("."), fn);
        }
        if (prop === "off") {
          return fn => __hookOff(phase, parts.join("."), fn);
        }
        if (prop === "emit") {
          return payload => __hookEmit(phase, parts.join("."), payload);
        }
        if (prop === "image") {
          return options => __hookRegisterImageHelper(phase, parts.join("."), options);
        }
        if (prop === "ui") {
          return (uiClassName, action = "toggle") => __bindUIToHook(phase, parts.join("."), uiClassName, action);
        }
        if (typeof prop === "symbol") {
          return undefined;
        }
        return __makeHookPathProxy(phase, parts.concat(String(prop)));
      },
      set(_target, prop, value) {
        if (typeof prop === "symbol") {
          return false;
        }
        const fullPath = parts.concat(String(prop)).join(".");
        return __applyActivationObject(phase, fullPath, value);
      }
    });
  }

  window.before = __makeHookPathProxy("before");
  window.during = __makeHookPathProxy("during");
  window.after = __makeHookPathProxy("after");
  window.GDModAPI = {
    on: __hookOn,
    once: __hookOnce,
    off: __hookOff,
    emit: __hookEmit,
    before: window.before,
    during: window.during,
    after: window.after,
    image: __hookShowImage,
    showUI: __showUI,
    hideUI: __hideUI,
    toggleUI: __toggleUI
  };

  function __makeActivateUIBuilder(config, state = "root") {
    return new Proxy(config, {
      get(target, prop) {
        if (prop === "__gdActivateType" || prop === "uiClassName" || prop === "mode" || prop === "animation" || prop === "durationMs" || prop === "thenAction" || prop === "extraActions") {
          return target[prop];
        }
        if (prop === "and") {
          return __makeActivateUIBuilder(target, "root");
        }
        if (prop === "activate" || prop === "enable" || prop === "disable") {
          return __makeAndActionBuilder(target, __makeActivateUIBuilder)[String(prop)];
        }
        if (prop === "for") {
          return __makeDurationChain(target, __makeActivateUIBuilder);
        }
        if (prop === "then") {
          return __makeThenBuilder(target, __makeActivateUIBuilder);
        }
        if (prop === "animate") {
          return __makeActivateUIBuilder(target, "animate");
        }
        if (prop === "from") {
          return __makeActivateUIBuilder(target, "from");
        }
        if (prop === "to") {
          return __makeActivateUIBuilder(target, "to");
        }
        if (prop === "show" || prop === "hide" || prop === "toggle") {
          target.mode = String(prop);
          return __makeActivateUIBuilder(target, "root");
        }
        const word = String(prop).toLowerCase();
        if (state === "from" && ["left", "right", "up", "down", "top", "bottom", "center", "left_top", "top_left", "right_top", "top_right", "left_bottom", "bottom_left", "right_bottom", "bottom_right"].includes(word)) {
          target.animation.from = word;
          return __makeActivateUIBuilder(target, "root");
        }
        if (state === "to" && ["left", "right", "top", "bottom", "center", "left_top", "top_left", "right_top", "top_right", "left_bottom", "bottom_left", "right_bottom", "bottom_right"].includes(word)) {
          target.animation.to = word;
          return __makeActivateUIBuilder(target, "root");
        }
        if (["ease", "elastic", "bounce", "exponential", "sine", "back"].includes(word)) {
          target.animation.easeType = word;
          return __makeActivateUIBuilder(target, "root");
        }
        if (word === "in" || word === "out") {
          target.animation.easeDirection = word;
          return __makeActivateUIBuilder(target, "root");
        }
        if (word === "inout" || (word === "in" && state === "in")) {
          target.animation.easeDirection = "inout";
          return __makeActivateUIBuilder(target, "root");
        }
        if (word === "durationms") {
          return ms => {
            target.animation.durationMs = Number(ms) || 520;
            return __makeActivateUIBuilder(target, "root");
          };
        }
        return __makeActivateUIBuilder(target, "root");
      }
    });
  }

  function __makeActivateModBuilder(config) {
    return new Proxy(config, {
      get(target, prop) {
        if (prop === "__gdActivateType" || prop === "modName" || prop === "enabled" || prop === "durationMs" || prop === "thenAction" || prop === "extraActions") {
          return target[prop];
        }
        if (prop === "and") {
          return __makeActivateModBuilder(target);
        }
        if (prop === "activate" || prop === "enable" || prop === "disable") {
          return __makeAndActionBuilder(target, __makeActivateModBuilder)[String(prop)];
        }
        if (prop === "for") {
          return __makeDurationChain(target, __makeActivateModBuilder);
        }
        if (prop === "then") {
          return __makeThenBuilder(target, __makeActivateModBuilder);
        }
        const w = String(prop).toLowerCase();
        if (w === "on" || w === "enable" || w === "enabled") {
          target.enabled = true;
        } else if (w === "off" || w === "disable" || w === "disabled") {
          target.enabled = false;
        }
        return __makeActivateModBuilder(target);
      }
    });
  }

  const __activateRoot = function (name) {
    const actionName = String(name || "");
    return {
      __gdActivateType: "named",
      actionName
    };
  };

  __activateRoot.ui = function (uiClassName, mode = "toggle") {
      const cfg = __makeUiAction(uiClassName, mode);
      return __makeActivateUIBuilder(cfg);
    };
  __activateRoot.mod = new Proxy({}, {
    get(_target, prop) {
      return __makeActivateModBuilder(__makeModAction(prop, true));
    }
  });
  window.activate = __activateRoot;
  window.def = function (name, activation) {
    const key = String(name || "").trim();
    if (key && __isActivationObject(activation)) {
      __namedActions.set(key, activation);
    }
    return activation;
  };
  window.enable = {
    ui(uiClassName) {
      return window.activate.ui(uiClassName, "show");
    },
    mod: new Proxy({}, {
      get(_target, prop) {
        return __makeActivateModBuilder(__makeModAction(prop, true));
      }
    })
  };
  window.disable = {
    ui(uiClassName) {
      return window.activate.ui(uiClassName, "hide");
    },
    mod: new Proxy({}, {
      get(_target, prop) {
        return __makeActivateModBuilder(__makeModAction(prop, false));
      }
    })
  };

  const LS_IMPORTED_MODS_KEY = "gd.importedMods.v1";
  const LS_FUN_TOGGLES_KEY = "gd.funModToggles.v1";
  const LOCAL_DEV_MOD_URL = "assets/mods/example.html";
  const DEFAULT_FUN_TOGGLES = {
    rainbow: false,
    noclip: false,
    platformerTest: false
  };

  let overlay = null;
  let loading = null;
  let activeTab = "loaded";
  const __executedImportedModIds = new Set();
  let __restartSuggested = false;

  function __runInlineScript(code, sourceLabel) {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.textContent = `${String(code || "")}\n//# sourceURL=${sourceLabel || "imported-mod.js"}`;
    document.body.appendChild(script);
    script.remove();
  }

  function __runExternalScript(src) {
    if (!src) {
      return;
    }
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = src;
    script.async = false;
    document.body.appendChild(script);
  }

  function __executeImportedHtmlMod(mod) {
    const content = String(mod && mod.content || "");
    const doc = new DOMParser().parseFromString(content, "text/html");
    const sourceName = mod && mod.name ? mod.name : "imported-mod.html";

    const headNodes = Array.from(doc.head ? doc.head.childNodes : []);
    const bodyNodes = Array.from(doc.body ? doc.body.childNodes : []);

    const inlineScripts = [];
    const externalScripts = [];

    const handleNode = node => {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }
      __normalizeClassColonAttributes(node);
      const tag = node.tagName.toUpperCase();
      if (tag === "SCRIPT") {
        const src = node.getAttribute("src");
        if (src) {
          externalScripts.push(src);
        } else {
          inlineScripts.push(node.textContent || "");
        }
        return;
      }
      if (tag === "LINK" || tag === "STYLE") {
        document.head.appendChild(node.cloneNode(true));
        return;
      }
      if (tag === "TITLE" || tag === "META") {
        return;
      }
      const clone = node.cloneNode(true);
      __normalizeClassColonAttributes(clone);
      clone.setAttribute("data-mod-source-id", mod && mod.id || "");
      document.body.appendChild(clone);
    };

    for (let i = 0; i < headNodes.length; i++) {
      handleNode(headNodes[i]);
    }
    for (let i = 0; i < bodyNodes.length; i++) {
      handleNode(bodyNodes[i]);
    }

    for (let i = 0; i < externalScripts.length; i++) {
      __runExternalScript(externalScripts[i]);
    }
    for (let i = 0; i < inlineScripts.length; i++) {
      __runInlineScript(inlineScripts[i], `${sourceName}#script${i + 1}`);
    }
    __initUIClassDefaults();
  }

  function __executeImportedScriptMod(mod) {
    __runInlineScript(mod && mod.content || "", mod && mod.name || "imported-mod.js");
  }

  function __executeImportedMods(mods) {
    const list = Array.isArray(mods) ? mods : [];
    for (let i = 0; i < list.length; i++) {
      const mod = list[i];
      if (!mod || !mod.id || __executedImportedModIds.has(mod.id)) {
        continue;
      }
      try {
        if (mod.kind === "html") {
          __executeImportedHtmlMod(mod);
        } else if (mod.kind === "script") {
          __executeImportedScriptMod(mod);
        }
        __executedImportedModIds.add(mod.id);
      } catch (err) {
        console.error("Failed to execute imported mod:", mod.name, err);
      }
    }
  }

  async function __loadLocalDevMod() {
    const id = `local:${LOCAL_DEV_MOD_URL}`;
    if (__executedImportedModIds.has(id)) {
      return;
    }
    try {
      const res = await fetch(LOCAL_DEV_MOD_URL + `?t=${Date.now()}`, {
        cache: "no-store"
      });
      if (!res.ok) {
        return;
      }
      const content = await res.text();
      if (!content || !content.trim()) {
        return;
      }
      __executeImportedHtmlMod({
        id,
        kind: "html",
        name: "example.html",
        content
      });
      __executedImportedModIds.add(id);
    } catch (_err) {}
  }

  function parseJSONSafe(raw, fallbackValue) {
    if (!raw) {
      return fallbackValue;
    }
    try {
      return JSON.parse(raw);
    } catch (_err) {
      return fallbackValue;
    }
  }

  function getImportedMods() {
    return parseJSONSafe(localStorage.getItem(LS_IMPORTED_MODS_KEY), []);
  }

  function setImportedMods(mods) {
    localStorage.setItem(LS_IMPORTED_MODS_KEY, JSON.stringify(mods));
  }

  function setRestartSuggested(enabled) {
    __restartSuggested = !!enabled;
    if (!overlay) {
      return;
    }
    const restartBtn = overlay.querySelector("[data-mod-restart-btn]");
    if (restartBtn) {
      restartBtn.hidden = !__restartSuggested;
    }
  }

  function escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function inferImportedModMeta(name, type, content) {
    const fileName = String(name || "mod");
    const extMatch = fileName.match(/\.([a-z0-9]+)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : "";
    const fallbackName = fileName.replace(/\.[^/.]+$/, "") || fileName;
    const kind = ext === "html" ? "html" : ext === "js" ? "script" : "file";
    const meta = {
      displayName: fallbackName,
      iconHref: null,
      kind
    };

    if (kind === "html") {
      const titleMatch = String(content || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch && titleMatch[1].trim()) {
        meta.displayName = titleMatch[1].trim();
      }
      const iconMatch = String(content || "").match(/<link[^>]*rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/i)
        || String(content || "").match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'][^"']*icon[^"']*["'][^>]*>/i);
      if (iconMatch && iconMatch[1].trim()) {
        meta.iconHref = iconMatch[1].trim();
      }
    }

    return meta;
  }

  function getFunToggles() {
    const saved = parseJSONSafe(localStorage.getItem(LS_FUN_TOGGLES_KEY), {});
    return {
      ...DEFAULT_FUN_TOGGLES,
      ...saved
    };
  }

  function applyFunToggles(toggles) {
    window.__gdFunModToggles = {
      ...DEFAULT_FUN_TOGGLES,
      ...toggles
    };
    window.dispatchEvent(new CustomEvent("gd:fun-mod-toggles", {
      detail: window.__gdFunModToggles
    }));
  }

  function setFunToggles(nextToggles) {
    const merged = {
      ...DEFAULT_FUN_TOGGLES,
      ...nextToggles
    };
    localStorage.setItem(LS_FUN_TOGGLES_KEY, JSON.stringify(merged));
    applyFunToggles(merged);
    renderLoadedMods();
  }

  function setActiveTab(tabId) {
    activeTab = tabId;
    if (!overlay) {
      return;
    }

    const btns = overlay.querySelectorAll("[data-mod-tab-btn]");
    for (let i = 0; i < btns.length; i++) {
      const btn = btns[i];
      const isActive = btn.getAttribute("data-mod-tab-btn") === tabId;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    }

    const panels = overlay.querySelectorAll("[data-mod-tab-panel]");
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      panel.classList.toggle("active", panel.getAttribute("data-mod-tab-panel") === tabId);
    }
  }

  function renderLoadedMods() {
    if (!overlay) {
      return;
    }

    const list = overlay.querySelector("[data-mod-loaded-list]");
    if (!list) {
      return;
    }

    const imported = getImportedMods();
    const rows = [];
    if (imported.length < 1) {
      rows.push("<div class=\"mod-card\"><div class=\"mod-card-icon\"></div><div><div class=\"mod-card-title\">No imported mods</div><div class=\"mod-card-meta\">Use Import Mods tab</div></div><button class=\"mod-card-delete\" disabled>Delete</button></div>");
    } else {
      for (let i = 0; i < imported.length; i++) {
        const mod = imported[i];
        const displayName = escapeHtml(mod.displayName || mod.name || "mod");
        const icon = mod.iconHref
          ? `<img class=\"mod-card-icon\" src=\"${escapeHtml(mod.iconHref)}\" alt=\"\" onerror=\"this.style.display='none'\" />`
          : "<div class=\"mod-card-icon\"></div>";
        rows.push(`<div class=\"mod-card\">${icon}<div><div class=\"mod-card-title\">${displayName}</div><div class=\"mod-card-meta\">${escapeHtml(mod.kind || mod.type || "file")} | ${Math.round((mod.size || 0) / 1024)} KB</div></div><button class=\"mod-card-delete\" data-mod-delete-id=\"${escapeHtml(mod.id)}\">Delete</button></div>`);
      }
    }

    list.innerHTML = rows.join("");
    setRestartSuggested(__restartSuggested);
  }

  function syncToggleInputs() {
    if (!overlay) {
      return;
    }
    const toggles = getFunToggles();
    const checks = overlay.querySelectorAll("[data-fun-mod-toggle]");
    for (let i = 0; i < checks.length; i++) {
      const input = checks[i];
      const key = input.getAttribute("data-fun-mod-toggle");
      input.checked = !!toggles[key];
    }
  }

  function setImportStatus(message) {
    if (!overlay) {
      return;
    }
    const status = overlay.querySelector("[data-mod-import-status]");
    if (status) {
      status.textContent = message || "";
    }
  }

  async function importSelectedFiles() {
    if (!overlay) {
      return;
    }
    const input = overlay.querySelector("[data-mod-file-input]");
    if (!input || !input.files || input.files.length < 1) {
      setImportStatus("Select one or more files first.");
      return;
    }

    const existing = getImportedMods();
    const imports = [];

    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i];
      let content = "";
      try {
        content = await file.text();
      } catch (_err) {
        continue;
      }
      const meta = inferImportedModMeta(file.name, file.type, content);
      imports.push({
        id: `${Date.now()}_${i}_${file.name}`,
        name: file.name,
        displayName: meta.displayName,
        iconHref: meta.iconHref,
        kind: meta.kind,
        type: file.type || "application/octet-stream",
        size: file.size || 0,
        importedAt: Date.now(),
        content
      });
    }

    if (imports.length < 1) {
      setImportStatus("No readable files were imported.");
      return;
    }

    const merged = existing.concat(imports);
    setImportedMods(merged);
    __executeImportedMods(imports);
    setImportStatus(`Imported ${imports.length} file(s). Injected into runtime. Restart recommended.`);
    setRestartSuggested(true);
    input.value = "";
    renderLoadedMods();
  }

  function bindOverlayEvents() {
    if (!overlay || overlay.dataset.bound === "1") {
      return;
    }
    overlay.dataset.bound = "1";

    const closeButtons = overlay.querySelectorAll("[data-mod-overlay-close]");
    for (let i = 0; i < closeButtons.length; i++) {
      closeButtons[i].addEventListener("click", () => closeOverlay());
    }

    overlay.addEventListener("click", e => {
      if (e.target === overlay) {
        closeOverlay();
      }
    });

    const tabButtons = overlay.querySelectorAll("[data-mod-tab-btn]");
    for (let i = 0; i < tabButtons.length; i++) {
      const btn = tabButtons[i];
      btn.addEventListener("click", () => {
        setActiveTab(btn.getAttribute("data-mod-tab-btn") || "loaded");
      });
    }

    const fileInput = overlay.querySelector("[data-mod-file-input]");
    if (fileInput) {
      fileInput.addEventListener("change", () => {
        importSelectedFiles();
      });
    }

    const clearBtn = overlay.querySelector("[data-mod-clear-imports-btn]");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        setImportedMods([]);
        setImportStatus("Imported mods cleared.");
        __executedImportedModIds.clear();
        setRestartSuggested(true);
        renderLoadedMods();
      });
    }

    const restartBtn = overlay.querySelector("[data-mod-restart-btn]");
    if (restartBtn) {
      restartBtn.addEventListener("click", () => {
        window.location.reload();
      });
    }

    overlay.addEventListener("click", e => {
      const target = e.target;
      if (!target || !(target instanceof Element)) {
        return;
      }
      const delId = target.getAttribute("data-mod-delete-id");
      if (!delId) {
        return;
      }
      const all = getImportedMods();
      const next = all.filter(mod => String(mod.id) !== String(delId));
      setImportedMods(next);
      setImportStatus("Mod removed from list. Restart to fully unload.");
      setRestartSuggested(true);
      renderLoadedMods();
    });

    const toggleInputs = overlay.querySelectorAll("[data-fun-mod-toggle]");
    for (let i = 0; i < toggleInputs.length; i++) {
      const input = toggleInputs[i];
      input.addEventListener("change", () => {
        const key = input.getAttribute("data-fun-mod-toggle");
        if (!key) {
          return;
        }
        const next = getFunToggles();
        next[key] = !!input.checked;
        setFunToggles(next);
      });
    }

    syncToggleInputs();
    renderLoadedMods();
    setActiveTab(activeTab);
  }

  async function ensureOverlayReady() {
    if (overlay) {
      return overlay;
    }
    if (loading) {
      return loading;
    }

    loading = (async () => {
      overlay = document.getElementById("modOverlay");
      if (!overlay) {
        try {
          const response = await fetch("assets/mods/ui-overlay.html", {
            cache: "no-cache"
          });
          if (response.ok) {
            const html = await response.text();
            const host = document.createElement("div");
            host.innerHTML = html;
            while (host.firstChild) {
              document.body.appendChild(host.firstChild);
            }
            overlay = document.getElementById("modOverlay");
          }
        } catch (_err) {}
      }
      if (!overlay) {
        console.warn("Overlay file not found: assets/mods/ui-overlay.html");
        return null;
      }
      bindOverlayEvents();
      return overlay;
    })();

    return loading;
  }

  function openOverlay() {
    ensureOverlayReady().then(el => {
      if (!el) {
        return;
      }
      renderLoadedMods();
      syncToggleInputs();
      setActiveTab(activeTab);
      el.style.display = "flex";
      el.setAttribute("aria-hidden", "false");
    });
  }

  function closeOverlay() {
    if (!overlay) {
      return;
    }
    overlay.style.display = "none";
    overlay.setAttribute("aria-hidden", "true");
  }

  function __initUIClassDefaults() {
    const all = document.querySelectorAll("[class*='UI_']");
    for (let i = 0; i < all.length; i++) {
      const node = all[i];
      const classes = Array.from(node.classList);
      for (let ci = 0; ci < classes.length; ci++) {
        const cls = classes[ci];
        if (cls.startsWith("UI_")) {
          if (!node.hasAttribute("data-ui-open")) {
            node.style.display = "none";
            node.setAttribute("data-ui-open", "0");
          }
          break;
        }
      }
    }
    const byId = document.querySelectorAll("[id^='UI_']");
    for (let i = 0; i < byId.length; i++) {
      const node = byId[i];
      if (!node.hasAttribute("data-ui-open")) {
        node.style.display = "none";
        node.setAttribute("data-ui-open", "0");
      }
    }
  }

  function __ensurePositionClassStyles() {
    if (document.getElementById("gdmod-position-style")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "gdmod-position-style";
    style.textContent = `
      .ic,.il,.ir,.sl,.sr{position:fixed !important;z-index:100050;max-width:90vw;max-height:90vh;}
      .ic{left:50% !important;top:50% !important;transform:translate(-50%,-50%) !important;}
      .il{left:20px !important;top:50% !important;transform:translate(0,-50%) !important;}
      .ir{right:20px !important;top:50% !important;transform:translate(0,-50%) !important;}
      .sl{left:0 !important;top:50% !important;transform:translate(-105%,-50%) !important;}
      .sr{right:0 !important;top:50% !important;transform:translate(105%,-50%) !important;}
    `;
    document.head.appendChild(style);
  }

  window.addEventListener("keydown", e => {
    const key = __normalizeKeyName(e.key);
    if (key && !__pressedKeys.has(key)) {
      __pressedKeys.set(key, performance.now());
    }
    __triggerInputHooks("key", performance.now(), {
      key,
      event: e
    });
    if (e.key === "Escape" && overlay && overlay.style.display !== "none") {
      closeOverlay();
    }
  });

  window.addEventListener("keyup", e => {
    const key = __normalizeKeyName(e.key);
    if (key) {
      __pressedKeys.delete(key);
    }
    __triggerInputHooks("key", performance.now(), {
      key,
      event: e
    });
  });

  window.addEventListener("mousedown", e => {
    const btnMap = {
      0: "left",
      1: "middle",
      2: "right",
      3: "back",
      4: "forward"
    };
    const button = btnMap[e.button] || "left";
    const path = `mouse.${button}`;
    __triggerInputHooks("mouse", performance.now(), {
      button,
      path,
      event: e
    });
  });

  window.openOverlay = openOverlay;
  window.closeOverlay = closeOverlay;
  window.attempt = {
    get count() {
      return __attemptState.count;
    }
  };
  window.larger = {
    than: new Proxy({}, {
      get(_t, prop) {
        const n = Number(prop);
        return Number.isFinite(n) ? n : 0;
      }
    })
  };
  window.smaller = {
    than: new Proxy({}, {
      get(_t, prop) {
        const n = Number(prop);
        return Number.isFinite(n) ? n : 0;
      }
    })
  };

  applyFunToggles(getFunToggles());
  __ensurePositionClassStyles();
  __initUIClassDefaults();
  __executeImportedMods(getImportedMods());
  __loadLocalDevMod();
  ensureOverlayReady();
})();
