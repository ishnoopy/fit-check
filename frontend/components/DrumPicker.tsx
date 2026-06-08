"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface DrumPickerProps {
  value: number;
  onChange: (value: number) => void;
  items: number[];
  itemHeight?: number;
  visibleItems?: number;
  formatValue?: (v: number) => string;
  className?: string;
}

export function DrumPicker({
  value,
  onChange,
  items,
  itemHeight = 36,
  visibleItems = 3,
  formatValue,
  className,
}: DrumPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const itemsRef = useRef(items);
  const itemHeightRef = useRef(itemHeight);
  const isActiveRef = useRef(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => { valueRef.current = value; }, [value]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { itemHeightRef.current = itemHeight; }, [itemHeight]);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

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

  // Scroll to current value whenever the drum becomes visible
  useEffect(() => {
    if (!isActive || !scrollRef.current) return;
    scrollRef.current.scrollTop = findClosestIndex(value, items) * itemHeight;
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close when clicking outside
  useEffect(() => {
    if (!isActive) return;
    const onOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsActive(false);
        isActiveRef.current = false;
      }
    };
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [isActive]);

  // Wheel handler — always captures scroll to prevent page scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const currentItems = itemsRef.current;
      const currentValue = valueRef.current;
      const currentIdx = findClosestIndex(currentValue, currentItems);
      const delta = e.deltaY > 0 ? 1 : -1;
      const newIdx = Math.max(0, Math.min(currentIdx + delta, currentItems.length - 1));
      onChangeRef.current(currentItems[newIdx]);

      if (!isActiveRef.current) {
        setIsActive(true);
        isActiveRef.current = true;
      }

      if (scrollRef.current) {
        scrollRef.current.scrollTop = newIdx * itemHeightRef.current;
      }

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setIsActive(false);
        isActiveRef.current = false;
      }, 800);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const commitAndClose = () => {
    if (!scrollRef.current) return;
    const index = Math.round(scrollRef.current.scrollTop / itemHeight);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    const newValue = items[clamped];
    if (newValue !== value) onChange(newValue);
    setIsActive(false);
    isActiveRef.current = false;
  };

  const handleScroll = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(commitAndClose, 350);
  };

  const display = formatValue ? formatValue(value) : String(value);

  const maskImage = `linear-gradient(to bottom, transparent 0%, black ${Math.round((offset / overlayHeight) * 100)}%, black ${Math.round(((offset + itemHeight) / overlayHeight) * 100)}%, transparent 100%)`;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", isActive && "rounded-lg", className)}
      style={{ height: isActive ? overlayHeight : itemHeight }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={!isActive ? () => setIsActive(true) : undefined}
    >
      {isActive ? (
        <>
          {/* Selection indicator */}
          <div
            className="pointer-events-none absolute inset-x-0 z-10 border-y border-foreground/30"
            style={{ top: offset, height: itemHeight }}
          />

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-full overflow-y-scroll"
            style={{
              scrollSnapType: "y mandatory",
              scrollPaddingTop: `${offset}px`,
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
                className="flex items-center justify-center font-black text-sm"
                style={{ height: itemHeight, scrollSnapAlign: "start" }}
              >
                {formatValue ? formatValue(item) : item}
              </div>
            ))}
            <div style={{ height: offset, flexShrink: 0 }} />
          </div>
        </>
      ) : (
        <div className="flex h-full items-center justify-center font-black text-sm select-none cursor-pointer active:opacity-60 transition-opacity">
          {display}
        </div>
      )}
    </div>
  );
}
