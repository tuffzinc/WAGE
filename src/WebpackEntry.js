const s = t(e ? i.exports : (e = 1, i.exports = (() => {
  var moduleFactories = globalThis.__GD_MODULE_MAP;
  var moduleCache = {};
  function requireModule(moduleId) {
    var cached = moduleCache[moduleId];
    if (cached !== undefined) {
      return cached.exports;
    }
    var moduleRecord = moduleCache[moduleId] = {
      exports: {}
    };
    moduleFactories[moduleId](moduleRecord, moduleRecord.exports, requireModule);
    return moduleRecord.exports;
  }
  requireModule.g = function () {
    if (typeof globalThis == "object") {
      return globalThis;
    }
    try {
      return this || new Function("return this")();
    } catch (e16) {
      if (typeof window == "object") {
        return window;
      }
    }
  }();
  return requireModule(85454);
})()));
