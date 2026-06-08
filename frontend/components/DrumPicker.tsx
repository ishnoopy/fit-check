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
  /** Fired when the drum activates (long-press / wheel). Use for haptics. */
  onActivate?: () => void;
  /** How long to hold before the drum activates on touch, in ms. */
  longPressMs?: number;
}

const MOVE_CANCEL_THRESHOLD = 10;

export function DrumPicker({
  value,
  onChange,
  items,
  itemHeight = 36,
  visibleItems = 3,
  formatValue,
  className,
  onActivate,
  longPressMs = 500,
}: DrumPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onActivateRef = useRef(onActivate);
  const itemsRef = useRef(items);
  const itemHeightRef = useRef(itemHeight);
  const longPressMsRef = useRef(longPressMs);
  const isActiveRef = useRef(false);
  const lastPointerTypeRef = useRef<string>("mouse");

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartYRef = useRef(0);
  const dragBaseYRef = useRef(0);
  const dragBaseScrollRef = useRef(0);
  const draggingRef = useRef(false);

  const [isActive, setIsActive] = useState(false);

  useEffect(() => { valueRef.current = value; }, [value]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onActivateRef.current = onActivate; }, [onActivate]);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { itemHeightRef.current = itemHeight; }, [itemHeight]);
  useEffect(() => { longPressMsRef.current = longPressMs; }, [longPressMs]);
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

  const activate = () => {
    setIsActive(true);
    isActiveRef.current = true;
    onActivateRef.current?.();
  };

  // Scroll to current value whenever the drum becomes visible
  useEffect(() => {
    if (!isActive || !scrollRef.current) return;
    scrollRef.current.scrollTop = findClosestIndex(value, items) * itemHeight;
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close when interacting outside
  useEffect(() => {
    if (!isActive) return;
    const onOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsActive(false);
        isActiveRef.current = false;
      }
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("touchstart", onOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
    };
  }, [isActive]);

  // Touch: long-press to activate, then drag to scroll (one continuous gesture).
  // Listeners are attached natively with { passive: false } because React's
  // synthetic touch handlers are passive and cannot call preventDefault.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const clearLongPress = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    const beginDrag = (touchY: number, baseScrollTop: number) => {
      draggingRef.current = true;
      dragBaseYRef.current = touchY;
      dragBaseScrollRef.current = baseScrollTop;
    };

    const onTouchStart = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      touchStartYRef.current = touchY;

      if (isActiveRef.current) {
        beginDrag(touchY, scrollRef.current?.scrollTop ?? 0);
        return;
      }

      clearLongPress();
      longPressTimerRef.current = setTimeout(() => {
        activate();
        const index = findClosestIndex(valueRef.current, itemsRef.current);
        beginDrag(touchStartYRef.current, index * itemHeightRef.current);
      }, longPressMsRef.current);
    };

    const onTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;

      if (!isActiveRef.current) {
        // Moving before the hold completes means the user is scrolling the
        // page, not picking — cancel activation and let the page scroll.
        if (Math.abs(touchY - touchStartYRef.current) > MOVE_CANCEL_THRESHOLD) {
          clearLongPress();
        }
        return;
      }

      e.preventDefault();
      if (draggingRef.current && scrollRef.current) {
        const delta = dragBaseYRef.current - touchY;
        scrollRef.current.scrollTop = dragBaseScrollRef.current + delta;
      }
    };

    const onTouchEnd = () => {
      clearLongPress();
      draggingRef.current = false;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  // Wheel handler — desktop scroll, always captures to prevent page scroll
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

      if (!isActiveRef.current) activate();

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
  }, []);

  const commitAndClose = () => {
    if (!scrollRef.current) return;
    // Don't collapse while the finger is still down mid-edit.
    if (draggingRef.current) {
      debounceRef.current = setTimeout(commitAndClose, 200);
      return;
    }
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
      style={{ height: isActive ? overlayHeight : itemHeight, touchAction: isActive ? "none" : undefined }}
      onPointerDown={(e) => {
        lastPointerTypeRef.current = e.pointerType;
        e.stopPropagation();
      }}
      onClick={() => {
        // Touch uses long-press to activate; ignore the synthetic tap click.
        if (!isActive && lastPointerTypeRef.current !== "touch") activate();
      }}
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
              touchAction: "none",
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
