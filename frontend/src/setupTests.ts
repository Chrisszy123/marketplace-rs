import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement scrollIntoView; stub it so components that call it don't crash.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
