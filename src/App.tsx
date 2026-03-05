import { useState } from 'react';
import Wizard from './components/Wizard/Wizard';
import CalendarView from './components/Calendar/CalendarView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useLocalStorage } from './hooks/useLocalStorage';
import { STORAGE_KEY } from './constants';
import type { WizardData } from './types';
import './App.css';

export default function App() {
    const [savedData, setSavedData] = useLocalStorage<WizardData | null>(STORAGE_KEY, null);
    const [showCalendar, setShowCalendar] = useState(!!savedData);

    const handleWizardComplete = (data: WizardData) => {
        setSavedData(data);
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
                    />
                ) : (
                    <Wizard onComplete={handleWizardComplete} initialData={savedData} />
                )}
            </ErrorBoundary>
        </div>
    );
}
