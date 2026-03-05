import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Catches runtime errors in the component tree, shows a graceful fallback,
 * and offers a reset button that clears localStorage before reloading.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error('ErrorBoundary caught an error:', error, info.componentStack);
    }

    private handleReset = (): void => {
        try {
            window.localStorage.clear();
        } catch {
            // Ignore storage errors — we're resetting anyway
        }
        window.location.reload();
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '100vh',
                        gap: '1rem',
                        padding: '2rem',
                        textAlign: 'center',
                        fontFamily: 'Inter, sans-serif',
                    }}
                >
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Something went wrong</h2>
                    <p style={{ color: '#6b7280', maxWidth: '400px' }}>
                        {this.state.error?.message ?? 'An unexpected error occurred.'}
                    </p>
                    <button
                        onClick={this.handleReset}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '0.5rem',
                            background: '#4F46E5',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 500,
                        }}
                    >
                        Reset Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
