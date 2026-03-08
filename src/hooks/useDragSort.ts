import { useState } from 'react';

interface DragKey {
    parentIndex: number;
    key: string;
}

interface UseDragSortReturn {
    draggingKey: DragKey | null;
    dragOverKey: DragKey | null;
    handleUnifiedDragStart: (parentIndex: number, key: string) => void;
    handleUnifiedDragOver: (
        e: React.DragEvent,
        parentIndex: number,
        key: string,
    ) => void;
    handleUnifiedDrop: (
        e: React.DragEvent,
        parentIndex: number,
        targetKey: string,
        onDrop: (parentIdx: number, fromKey: string, toKey: string) => void,
    ) => void;
    handleUnifiedDragEnd: () => void;
}

export function useDragSort(): UseDragSortReturn {
    const [draggingKey, setDraggingKey] = useState<DragKey | null>(null);
    const [dragOverKey, setDragOverKey] = useState<DragKey | null>(null);

    const handleUnifiedDragStart = (parentIndex: number, key: string) => {
        setDraggingKey({ parentIndex, key });
    };

    const handleUnifiedDragOver = (
        e: React.DragEvent,
        parentIndex: number,
        key: string,
    ) => {
        if (!draggingKey || draggingKey.parentIndex !== parentIndex) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverKey?.key !== key || dragOverKey?.parentIndex !== parentIndex) {
            setDragOverKey({ parentIndex, key });
        }
    };

    const handleUnifiedDrop = (
        e: React.DragEvent,
        parentIndex: number,
        targetKey: string,
        onDrop: (parentIdx: number, fromKey: string, toKey: string) => void,
    ) => {
        e.preventDefault();
        if (!draggingKey || draggingKey.parentIndex !== parentIndex) {
            setDraggingKey(null);
            setDragOverKey(null);
            return;
        }
        const sourceKey = draggingKey.key;
        if (sourceKey !== targetKey) {
            onDrop(parentIndex, sourceKey, targetKey);
        }
        setDraggingKey(null);
        setDragOverKey(null);
    };

    const handleUnifiedDragEnd = () => {
        setDraggingKey(null);
        setDragOverKey(null);
    };

    return {
        draggingKey,
        dragOverKey,
        handleUnifiedDragStart,
        handleUnifiedDragOver,
        handleUnifiedDrop,
        handleUnifiedDragEnd,
    };
}
