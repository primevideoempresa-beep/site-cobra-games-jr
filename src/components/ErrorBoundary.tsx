import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home, Terminal } from 'lucide-react';
import { LoggerService } from '../services/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });

    // Log to remote service
    LoggerService.logError('React Crash Caught by ErrorBoundary', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    }, 'general').catch(err => console.error('Failed to log error remotely:', err));
    
    // Store in window for extra visibility
    if (typeof window !== 'undefined') {
      (window as any).lastReactError = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      };
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans">
          <div className="max-w-2xl w-full bg-zinc-900 border border-red-500/30 rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-red-500/10">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-red-500/10 rounded-2xl">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">CRITICAL SYSTEM FAILURE</h1>
                <p className="text-red-500/70 font-bold text-xs uppercase tracking-widest">O React encontrou um erro fatal</p>
              </div>
            </div>

            <div className="bg-black/50 border border-zinc-800 rounded-2xl p-6 mb-8 font-mono text-sm overflow-hidden">
              <div className="flex items-center gap-2 text-zinc-500 mb-4 border-b border-zinc-800 pb-2">
                <Terminal className="w-4 h-4" />
                <span>Console Diagnostic</span>
              </div>
              <div className="text-red-400 font-bold mb-2 break-words">
                {this.state.error?.name}: {this.state.error?.message}
              </div>
              <div className="text-zinc-500 text-[10px] leading-relaxed overflow-auto max-h-40 whitespace-pre-wrap scrollbar-thin scrollbar-thumb-zinc-700">
                {this.state.error?.stack}
                {this.state.errorInfo?.componentStack && (
                  <>
                    <br /><br />
                    Component Stack:<br />
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 bg-white hover:bg-zinc-200 text-black font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <RefreshCcw className="w-5 h-5" />
                <span>Recarregar Aplicação</span>
              </button>
              <button
                type="button"
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Home className="w-5 h-5" />
                <span>Página Inicial</span>
              </button>
            </div>

            <p className="mt-8 text-center text-zinc-600 text-[10px] uppercase font-bold tracking-[0.2em]">
              Cobra Games Jr — Admin Security Shield
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
