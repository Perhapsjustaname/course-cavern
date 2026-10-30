'use client';

import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';

/**
 * Reorder a list by dragging a handle, or by the up and down buttons, which
 * also work by keyboard and on touch screens where drag and drop does not.
 *
 * The list is reordered on screen straight away and the complete new order is
 * sent to the server. If the server refuses it, the list goes back.
 *
 * The handle is the thing that is dragged (the whole row is shown moving), so
 * text fields and buttons inside a row behave normally. Lists nest (lessons
 * inside sections, both draggable), so each list only reacts to a drag it
 * started and lets every other drag pass through to the list around it.
 */
export function useSortable<T extends { id: string }>(items: T[], persist: (ids: string[]) => Promise<boolean>) {
  const [order, setOrder] = useState(items);
  const [saving, setSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const orderRef = useRef(order);
  const draggingRef = useRef<string | null>(null);
  const before = useRef<T[] | null>(null);
  const dropped = useRef(false);

  const apply = (next: T[]) => {
    orderRef.current = next;
    setOrder(next);
  };

  // Fresh data from the server (after any save) replaces the local order.
  useEffect(() => {
    apply(items);
  }, [items]);

  const commit = useCallback(
    async (next: T[], previous: T[]) => {
      if (next.map((x) => x.id).join() === previous.map((x) => x.id).join()) return;
      apply(next);
      setSaving(true);
      const ok = await persist(next.map((x) => x.id)).catch(() => false);
      setSaving(false);
      if (!ok) apply(previous);
    },
    [persist],
  );

  const move = useCallback(
    (id: string, delta: -1 | 1) => {
      const current = orderRef.current;
      const i = current.findIndex((x) => x.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= current.length) return;
      const next = [...current];
      [next[i], next[j]] = [next[j]!, next[i]!];
      void commit(next, current);
    },
    [commit],
  );

  const end = () => {
    draggingRef.current = null;
    setDraggingId(null);
    before.current = null;
  };

  function handleProps(id: string) {
    return {
      draggable: true,
      'aria-hidden': true as const,
      onDragStart(e: DragEvent<HTMLElement>) {
        e.stopPropagation();
        const row = e.currentTarget.closest('[data-sortable-row]');
        if (row instanceof HTMLElement) e.dataTransfer.setDragImage(row, 24, 24);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        before.current = orderRef.current;
        dropped.current = false;
        draggingRef.current = id;
        setDraggingId(id);
      },
      onDragEnd(e: DragEvent) {
        if (draggingRef.current !== id) return;
        e.stopPropagation();
        // Let go outside the list: put everything back where it was.
        if (!dropped.current && before.current) apply(before.current);
        end();
      },
    };
  }

  function rowProps(id: string) {
    return {
      'data-sortable-row': true,
      onDragOver(e: DragEvent) {
        const dragging = draggingRef.current;
        if (!dragging) return; // not this list's drag; let it reach the outer list
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        const current = orderRef.current;
        const from = current.findIndex((x) => x.id === dragging);
        const to = current.findIndex((x) => x.id === id);
        if (from < 0 || to < 0 || from === to) return;
        const next = [...current];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved!);
        apply(next);
      },
      onDrop(e: DragEvent) {
        if (!draggingRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        dropped.current = true;
        const previous = before.current;
        end();
        if (previous) void commit(orderRef.current, previous);
      },
    };
  }

  return { order, saving, draggingId, move, rowProps, handleProps };
}
