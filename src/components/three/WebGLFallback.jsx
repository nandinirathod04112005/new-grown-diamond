import { Component } from 'react';

/** Prevents a lost/unsupported WebGL context from blanking the surrounding page. */
export default class WebGLFallback extends Component {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error) {
    if (import.meta.env.DEV) console.warn('WebGL scene unavailable; using fallback.', error);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
