import { useCallback, useEffect, useRef } from 'react';

const EDGE_PX = 56;
const STEP_PX = 14;

export function scrollElementAtPoint(
  el: HTMLElement,
  clientX: number,
  clientY: number,
  axis: 'x' | 'y' | 'both' = 'both',
): void {
  const rect = el.getBoundingClientRect();
  if (axis === 'x' || axis === 'both') {
    if (clientX - rect.left < EDGE_PX) el.scrollLeft -= STEP_PX;
    else if (rect.right - clientX < EDGE_PX) el.scrollLeft += STEP_PX;
  }
  if (axis === 'y' || axis === 'both') {
    if (clientY - rect.top < EDGE_PX) el.scrollTop -= STEP_PX;
    else if (rect.bottom - clientY < EDGE_PX) el.scrollTop += STEP_PX;
  }
}

/** Auto-scroll do board horizontal e colunas verticais durante HTML5 drag. */
export function useKanbanAutoScroll() {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const columnScrollRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const draggingRef = useRef(false);

  const registerColumnScroll = useCallback((stageId: string, el: HTMLDivElement | null) => {
    if (el) columnScrollRefs.current.set(stageId, el);
    else columnScrollRefs.current.delete(stageId);
  }, []);

  const onDragStart = useCallback(() => {
    draggingRef.current = true;
  }, []);

  const onDragEnd = useCallback(() => {
    draggingRef.current = false;
  }, []);

  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      if (boardRef.current) {
        scrollElementAtPoint(boardRef.current, e.clientX, e.clientY, 'x');
      }
      for (const col of columnScrollRefs.current.values()) {
        const rect = col.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          scrollElementAtPoint(col, e.clientX, e.clientY, 'y');
          break;
        }
      }
    };

    document.addEventListener('dragover', onDragOver);
    return () => document.removeEventListener('dragover', onDragOver);
  }, []);

  return { boardRef, registerColumnScroll, onDragStart, onDragEnd };
}
