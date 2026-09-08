import { Component, type ErrorInfo, type ReactNode } from 'react';
import { STORAGE_KEY } from '../constants';
import { en } from '../i18n/en';
import { es } from '../i18n/es';
import { LANG_STORAGE_KEY } from '../i18n/LanguageContext';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

function readLang(): 'en' | 'es' {
    try {
        return window.localStorage.getItem(LANG_STORAGE_KEY) === 'es' ? 'es' : 'en';
    } catch {
        return 'en';
    }
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error('ErrorBoundary caught an error:', error, info.componentStack);
    }

    private handleReset = (): void => {
        try {
            window.localStorage.removeItem(STORAGE_KEY);
        } catch {
            /* resetting anyway */
        }
        window.location.reload();
    };

    render(): ReactNode {
        if (!this.state.hasError) return this.props.children;
        const t = readLang() === 'es' ? es : en;
        return (
            <div className="error-boundary" role="alert">
                <h2>{t.errorTitle}</h2>
                <button type="button" className="btn btn-primary" onClick={this.handleReset}>
                    {t.errorReset}
                </button>
            </div>
        );
    }
}
