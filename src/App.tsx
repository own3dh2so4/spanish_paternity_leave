import { useState } from 'react';
import Wizard from './components/Wizard/Wizard';
import CalendarView from './components/Calendar/CalendarView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useLocalStorage } from './hooks/useLocalStorage';
import { STORAGE_KEY } from './constants';
import { decompressWizardData } from './utils/shareUtils';
import { computeSchedule } from './utils/calendarHelpers';
import type { WizardData } from './types';
import { LanguageProvider } from './i18n/LanguageContext';
import { ThemeProvider } from './theme/ThemeContext';
import './App.css';

export default function App() {
    // Initial hidden structure for when we first mount from a shared link
    const [initialHidden, setInitialHidden] = useState<Set<number>>(new Set());

    // Run this synchronously once on mount before useLocalStorage initializes
    useState(() => {
        const params = new URLSearchParams(window.location.search);
        const shareParam = params.get('share');
        if (shareParam) {
            const payload = decompressWizardData(shareParam);
            if (payload) {
                // Overwrite localStorage immediately so useLocalStorage picks it up
                try {
                    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.data));
                } catch {
                    // Ignore storage errors if localStorage is disabled or full
                }
                setInitialHidden(new Set(payload.hiddenParents));
                window.history.replaceState({}, '', window.location.pathname);
            }
        }
        return null;
    });

    const [savedData, setSavedData] = useLocalStorage<WizardData | null>(STORAGE_KEY, null);
    const [showCalendar, setShowCalendar] = useState(!!savedData);

    const handleWizardComplete = (data: WizardData) => {
        const withSchedule = { ...data, schedule: computeSchedule(data) };
        setSavedData(withSchedule);
        setShowCalendar(true);
    };

    const handleEdit = () => {
        setShowCalendar(false);
    };

    const handleReset = () => {
        setSavedData(null);
        setShowCalendar(false);
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
                                onEdit={handleEdit}
                                onReset={handleReset}
                                onUpdateData={setSavedData}
                                initialHidden={initialHidden}
                            />
                        ) : (
                            <Wizard onComplete={handleWizardComplete} initialData={savedData} />
                        )}
                    </ErrorBoundary>
                </div>
            </LanguageProvider>
        </ThemeProvider>
    );
}
