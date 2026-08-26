import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error, 
      errorInfo: null, 
      showDetails: false 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-bengali">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-700 text-amber-300 text-xs font-semibold">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>জাপান সিটি টাওয়ার সিস্টেম</span>
              </div>
              <h1 className="text-xl font-bold text-white">
                {this.props.fallbackTitle || 'অ্যাপ্লিকেশন লোড হতে সমস্যা হয়েছে'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {this.props.fallbackMessage || 'সাময়িক ত্রুটির কারণে এই পেজটি লোড করা সম্ভব হয়নি। অনুগ্রহ করে পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={this.handleRetry}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-md transition active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>আবার চেষ্টা করুন</span>
              </button>
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-sm transition"
              >
                <Home className="w-4 h-4" />
                <span>মূল পাতা</span>
              </button>
            </div>

            {this.state.error && (
              <div className="text-left pt-4 border-t border-slate-700">
                <button
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  className="text-[11px] text-slate-400 hover:text-slate-200 underline block mx-auto"
                >
                  {this.state.showDetails ? 'কারিগরি তথ্য লুকান' : 'কারিগরি বিস্তারিত দেখুন'}
                </button>
                {this.state.showDetails && (
                  <div className="mt-3 p-3 bg-slate-950/80 rounded-xl text-[11px] font-mono text-rose-300 overflow-x-auto max-h-32 border border-slate-700">
                    <p className="font-bold">{this.state.error.name}: {this.state.error.message}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
