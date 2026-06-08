"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface DrumPickerProps {
  value: number;
  onChange: (value: number) => void;
  items: number[];
  itemHeight?: number;
  visibleItems?: number;
  formatValue?: (v: number) => string;
  className?: string;
}

const SELECTED_FONT_SIZE = "15px";
const NEIGHBOR_FONT_SIZE = "10px";

/**
 * Always-visible scroll wheel. The centered value is shown large and bold; the
 * neighbours are small and faded. Scrolling is native (touch + wheel) so it
 * works on mobile without any tap/long-press to activate. Only the centered
 * row's style is mutated on scroll, so it stays smooth even with long lists.
 */
export function DrumPicker({
  value,
  onChange,
  items,
  itemHeight = 16,
  visibleItems = 3,
  formatValue,
  className,
}: DrumPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const itemsRef = useRef(items);
  const valueRef = useRef(value);
  const centeredIndexRef = useRef(0);
  const isScrollingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const scrollEndRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { valueRef.current = value; }, [value]);

  const overlayHeight = itemHeight * visibleItems;
  const offset = Math.floor(visibleItems / 2) * itemHeight;

  const findClosestIndex = (val: number, list: number[]) => {
    let best = 0;
    let bestDiff = Math.abs(list[0] - val);
    for (let i = 1; i < list.length; i++) {
      const diff = Math.abs(list[i] - val);
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    }
    return best;
  };

  const styleSelected = (node: HTMLElement | undefined) => {
    if (!node) return;
    node.style.fontSize = SELECTED_FONT_SIZE;
    node.style.fontWeight = "900";
    node.style.opacity = "1";
  };

  const styleNeighbor = (node: HTMLElement | undefined) => {
    if (!node) return;
    node.style.fontSize = NEIGHBOR_FONT_SIZE;
    node.style.fontWeight = "700";
    node.style.opacity = "0.4";
  };

  const itemNode = (index: number) =>
    scrollRef.current?.children[index + 1] as HTMLElement | undefined;

  const selectIndex = (index: number) => {
    if (index === centeredIndexRef.current) {
      styleSelected(itemNode(index));
      return;
    }
    styleNeighbor(itemNode(centeredIndexRef.current));
    styleSelected(itemNode(index));
    centeredIndexRef.current = index;
  };

  // Keep the wheel aligned to the controlled value, but never while the user is
  // actively scrolling (that would fight their gesture).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isScrollingRef.current) return;
    const index = findClosestIndex(value, items);
    el.scrollTop = index * itemHeight;
    selectIndex(index);
  }, [value, items, itemHeight]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = () => {
    isScrollingRef.current = true;

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const el = scrollRef.current;
        if (!el) return;
        const list = itemsRef.current;
        const index = Math.max(0, Math.min(Math.round(el.scrollTop / itemHeight), list.length - 1));
        if (index !== centeredIndexRef.current) selectIndex(index);
      });
    }

    if (scrollEndRef.current) clearTimeout(scrollEndRef.current);
    scrollEndRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      const list = itemsRef.current;
      const newValue = list[centeredIndexRef.current];
      if (newValue !== valueRef.current) onChangeRef.current(newValue);
    }, 140);
  };

  const maskImage = `linear-gradient(to bottom, transparent 0%, black ${Math.round((offset / overlayHeight) * 100)}%, black ${Math.round(((offset + itemHeight) / overlayHeight) * 100)}%, transparent 100%)`;

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ height: overlayHeight }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll [&::-webkit-scrollbar]:hidden"
        style={{
          scrollSnapType: "y mandatory",
          overscrollBehavior: "contain",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          maskImage,
          WebkitMaskImage: maskImage,
        } as React.CSSProperties}
      >
        <div style={{ height: offset, flexShrink: 0 }} />
        {items.map((item) => (
          <div
            key={item}
            className="flex items-center justify-center font-bold opacity-40 select-none"
            style={{ height: itemHeight, fontSize: NEIGHBOR_FONT_SIZE, scrollSnapAlign: "center", lineHeight: 1 }}
          >
            {formatValue ? formatValue(item) : item}
          </div>
        ))}
        <div style={{ height: offset, flexShrink: 0 }} />
      </div>
    </div>
  );
}
