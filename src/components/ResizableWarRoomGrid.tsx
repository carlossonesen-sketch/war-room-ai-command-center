import { PointerEvent, ReactNode, useMemo, useRef } from "react";
import type { PanelWidths } from "../types";

interface ResizableWarRoomGridProps {
  widths: PanelWidths;
  onChangeWidths: (widths: PanelWidths) => void;
  children: [ReactNode, ReactNode, ReactNode, ReactNode, ReactNode];
}

const minWidths: PanelWidths = [0.7, 0.7, 1.15, 0.7, 0.7];

function clampPanelWidths(widths: PanelWidths): PanelWidths {
  let nextWidths = widths.map((width, index) => Math.max(width, minWidths[index])) as PanelWidths;
  const total = widths.reduce((sum, width) => sum + width, 0);
  const nextTotal = nextWidths.reduce((sum, width) => sum + width, 0);

  if (nextTotal <= total) {
    return nextWidths;
  }

  const overflow = nextTotal - total;
  const adjustable = nextWidths
    .map((width, index) => Math.max(0, width - minWidths[index]))
    .reduce((sum, width) => sum + width, 0);

  if (adjustable === 0) {
    return nextWidths;
  }

  nextWidths = nextWidths.map((width, index) => {
    const room = Math.max(0, width - minWidths[index]);
    return width - overflow * (room / adjustable);
  }) as PanelWidths;

  return nextWidths.map((width, index) => Math.max(width, minWidths[index])) as PanelWidths;
}

export function ResizableWarRoomGrid({
  widths,
  onChangeWidths,
  children
}: ResizableWarRoomGridProps) {
  const gridRef = useRef<HTMLElement | null>(null);
  const dragStateRef = useRef<{
    handleIndex: number;
    startX: number;
    startWidths: PanelWidths;
    frPerPixel: number;
  } | null>(null);

  const gridTemplateColumns = useMemo(() => {
    return widths.map((width) => `minmax(0, ${width}fr)`).join(" 14px ");
  }, [widths]);

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, handleIndex: number) {
    const grid = gridRef.current;

    if (!grid) {
      return;
    }

    const gridWidth = grid.getBoundingClientRect().width;
    const totalWidth = widths.reduce((sum, width) => sum + width, 0);
    const frPerPixel = totalWidth / Math.max(gridWidth, 1);

    dragStateRef.current = {
      handleIndex,
      startX: event.clientX,
      startWidths: widths,
      frPerPixel
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.classList.add("is-resizing-panels");
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const dragState = dragStateRef.current;

    if (!dragState) {
      return;
    }

    const delta = (event.clientX - dragState.startX) * dragState.frPerPixel;
    const leftIndex = dragState.handleIndex;
    const rightIndex = dragState.handleIndex + 1;
    const nextWidths = [...dragState.startWidths] as PanelWidths;
    const pairTotal = dragState.startWidths[leftIndex] + dragState.startWidths[rightIndex];

    nextWidths[leftIndex] = Math.min(
      pairTotal - minWidths[rightIndex],
      Math.max(minWidths[leftIndex], dragState.startWidths[leftIndex] + delta)
    );
    nextWidths[rightIndex] = pairTotal - nextWidths[leftIndex];

    onChangeWidths(clampPanelWidths(nextWidths));
  }

  function stopDragging(event: PointerEvent<HTMLButtonElement>) {
    if (!dragStateRef.current) {
      return;
    }

    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    document.body.classList.remove("is-resizing-panels");
  }

  return (
    <section
      ref={gridRef}
      className="war-room-grid"
      style={{ gridTemplateColumns }}
      aria-label="War Room chat panels"
    >
      {children[0]}
      <button
        className="panel-resizer"
        type="button"
        aria-label="Resize Desktop Companion and Cursor Builder panels"
        onPointerDown={(event) => handlePointerDown(event, 0)}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      />
      {children[1]}
      <button
        className="panel-resizer"
        type="button"
        aria-label="Resize Cursor Builder and Group War Room panels"
        onPointerDown={(event) => handlePointerDown(event, 1)}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      />
      {children[2]}
      <button
        className="panel-resizer panel-resizer--strong"
        type="button"
        aria-label="Resize Group War Room and Business Planner panels"
        onPointerDown={(event) => handlePointerDown(event, 2)}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      />
      {children[3]}
      <button
        className="panel-resizer"
        type="button"
        aria-label="Resize Business Planner and Code Reviewer panels"
        onPointerDown={(event) => handlePointerDown(event, 3)}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      />
      {children[4]}
    </section>
  );
}
