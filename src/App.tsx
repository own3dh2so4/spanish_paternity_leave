import { useState } from 'react';
import Wizard from './components/Wizard/Wizard';
import CalendarView from './components/Calendar/CalendarView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useLocalStorage } from './hooks/useLocalStorage';
import { STORAGE_KEY } from './constants';
import { decompressWizardData, validateWizardData } from './utils/shareUtils';
import { withSchedule } from './utils/calendarHelpers';
import type { WizardData, WizardInput } from './types';
import { LanguageProvider } from './i18n/LanguageContext';
import { ThemeProvider } from './theme/ThemeContext';
import './App.css';

interface ShareResult {
    data: WizardData | null;
    hiddenParents: Set<number>;
    invalid: boolean;
}

function readShareParam(): ShareResult {
    const params = new URLSearchParams(window.location.search);
    const shareParam = params.get('share');
    if (!shareParam) return { data: null, hiddenParents: new Set(), invalid: false };

    params.delete('share');
    const query = params.toString();
    window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`,
    );

    const payload = decompressWizardData(shareParam);
    if (!payload) return { data: null, hiddenParents: new Set(), invalid: true };
    return { data: payload.data, hiddenParents: new Set(payload.hiddenParents), invalid: false };
}

export default function App() {
    const [share] = useState(readShareParam);

    const [savedData, setSavedData] = useLocalStorage<WizardData | null>(STORAGE_KEY, null, {
        validate: validateWizardData,
        override: share.data ?? undefined,
    });
    const [showCalendar, setShowCalendar] = useState(savedData !== null);

    const handleWizardComplete = (input: WizardInput) => {
        setSavedData(withSchedule(input));
        setShowCalendar(true);
    };

    return (
        <ThemeProvider>
            <LanguageProvider>
                <div className="app">
                    <div className="bg-gradient" />
                    <div className="bg-grid" />
                    <ErrorBoundary>
                        {showCalendar && savedData ? (
                            <CalendarView
                                data={savedData}
                                onEdit={() => setShowCalendar(false)}
                                onReset={() => {
                                    setSavedData(null);
                                    setShowCalendar(false);
                                }}
                                onUpdateData={setSavedData}
                                initialHidden={share.hiddenParents}
                            />
                        ) : (
                            <Wizard
                                onComplete={handleWizardComplete}
                                initialData={savedData}
                                invalidShareLink={share.invalid}
                            />
                        )}
                    </ErrorBoundary>
                </div>
            </LanguageProvider>
        </ThemeProvider>
    );
}
