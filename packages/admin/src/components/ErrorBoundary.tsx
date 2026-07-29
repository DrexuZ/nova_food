import { Component, ReactNode } from 'react';
import i18n from '../i18n/index.js';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error('=== ErrorBoundary caught ===');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('ComponentStack:', info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg w-full">
            <h1 className="text-xl font-bold text-red-600 mb-4">{i18n.t('errorBoundary.title')}</h1>
            <p className="text-sm text-gray-600 mb-4 font-mono bg-gray-50 p-3 rounded">
              {this.state.error.message}
            </p>
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer font-medium mb-2">{i18n.t('errorBoundary.stackTrace')}</summary>
              <pre className="bg-gray-50 p-3 rounded overflow-auto max-h-60 whitespace-pre-wrap">
                {this.state.error.stack}
              </pre>
            </details>
            <button
              onClick={() => { localStorage.removeItem('token'); window.location.reload(); }}
              className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700"
            >
              {i18n.t('errorBoundary.clearSession')}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
