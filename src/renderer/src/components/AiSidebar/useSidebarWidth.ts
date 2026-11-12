import { useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

const WIDTH_KEY = 'revezone.aiSidebar.width';
const DEFAULT_WIDTH = 360;
const MIN_WIDTH = 224;
const MAX_WIDTH = 760;
const EDITOR_MIN_WIDTH = 360;
const OVERLAY_BREAKPOINT = 640;
// Excalidraw switches to its mobile tools below this editor width.
const EDITOR_DESKTOP_WIDTH = 730;
const KEYBOARD_STEP = 24;

function savedWidth() {
  try {
    const value = Number(localStorage.getItem(WIDTH_KEY));
    if (Number.isFinite(value) && value >= MIN_WIDTH && value <= MAX_WIDTH) return value;
  } catch {
    // The panel can still be resized if local storage is unavailable.
  }
  return undefined;
}

type Drag = { pointerId: number; startX: number; startWidth: number };

export default function useSidebarWidth() {
  const workspace = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag>();
  const [workspaceWidth, setWorkspaceWidth] = useState(0);
  const [preferredWidth, setPreferredWidth] = useState(savedWidth);
  const [dragWidth, setDragWidth] = useState<number>();
  const overlay = workspaceWidth > 0 && workspaceWidth < OVERLAY_BREAKPOINT;
  const max = workspaceWidth
    ? Math.min(
        MAX_WIDTH,
        overlay ? Math.floor(workspaceWidth * 0.85) : workspaceWidth - EDITOR_MIN_WIDTH
      )
    : MAX_WIDTH;
  const min = Math.min(MIN_WIDTH, max);
  const clampWidth = (value: number) => Math.round(Math.max(min, Math.min(value, max)));
  const defaultWidth = workspaceWidth
    ? Math.min(workspaceWidth / 3, Math.max(MIN_WIDTH, workspaceWidth - EDITOR_DESKTOP_WIDTH))
    : DEFAULT_WIDTH;
  const width = clampWidth(dragWidth ?? preferredWidth ?? defaultWidth);

  useLayoutEffect(() => {
    const node = workspace.current;
    if (!node) return;
    const measure = () => setWorkspaceWidth(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function save(value?: number) {
    const preference =
      value === undefined ? undefined : Math.max(MIN_WIDTH, Math.min(value, MAX_WIDTH));
    setPreferredWidth(preference);
    try {
      if (preference === undefined) localStorage.removeItem(WIDTH_KEY);
      else localStorage.setItem(WIDTH_KEY, String(preference));
    } catch {
      // Keep the current size for this session.
    }
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || drag.current) return;
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: width };
    setDragWidth(width);
  }

  function widthAt(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || event.pointerId !== start.pointerId) return undefined;
    return clampWidth(start.startWidth + start.startX - event.clientX);
  }

  function cancelDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerId !== drag.current?.pointerId) return;
    drag.current = undefined;
    setDragWidth(undefined);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? KEYBOARD_STEP * 3 : KEYBOARD_STEP;
    const sizes = { ArrowLeft: width + step, ArrowRight: width - step, Home: min, End: max };
    const size = sizes[event.key as keyof typeof sizes];
    if (typeof size !== 'number') return;
    event.preventDefault();
    const next = clampWidth(size);
    if (next !== width) save(next);
  }

  return {
    workspace,
    overlay,
    width,
    dragging: dragWidth !== undefined,
    handle: {
      'aria-valuemin': min,
      'aria-valuemax': max,
      'aria-valuenow': width,
      'aria-valuetext': width + ' px',
      onPointerDown,
      onPointerMove(event: PointerEvent<HTMLDivElement>) {
        const next = widthAt(event);
        if (next !== undefined) setDragWidth(next);
      },
      onPointerUp(event: PointerEvent<HTMLDivElement>) {
        const next = widthAt(event);
        const startWidth = drag.current?.startWidth;
        cancelDrag(event);
        if (next !== undefined && next !== startWidth) save(next);
      },
      onPointerCancel: cancelDrag,
      onLostPointerCapture: cancelDrag,
      onDoubleClick: () => save(),
      onKeyDown
    }
  };
}
