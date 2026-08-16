import { useCallback, useEffect, useRef, useState } from "react";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  file: File;
  /** The real size of the picture, in its own pixels. */
  size: { width: number; height: number };
  box: Box;
  onChange: (box: Box) => void;
}

type Grab =
  | { kind: "move"; startX: number; startY: number; from: Box }
  | { kind: "corner"; corner: Corner; from: Box };

type Corner = "nw" | "ne" | "sw" | "se";

const HANDLES: Array<{ corner: Corner; className: string; label: string }> = [
  {
    corner: "nw",
    className: "-top-2 -left-2 cursor-nwse-resize",
    label: "top left",
  },
  {
    corner: "ne",
    className: "-top-2 -right-2 cursor-nesw-resize",
    label: "top right",
  },
  {
    corner: "sw",
    className: "-bottom-2 -left-2 cursor-nesw-resize",
    label: "bottom left",
  },
  {
    corner: "se",
    className: "-bottom-2 -right-2 cursor-nwse-resize",
    label: "bottom right",
  },
];

const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value));

/**
 * Choosing the crop by dragging it.
 *
 * The tool used to ask for four numbers and show the picture nowhere near
 * them. On a phone that is close to unusable: the keyboard covers the screen,
 * and a person cannot see what "from the left: 240" means for the photograph
 * they are holding.
 *
 * The numbers are still there and still work. This draws the same rectangle on
 * the picture and lets it be dragged, and the two stay in step, so a visitor
 * can be exact when they need to be and quick when they do not.
 *
 * Pointer events are used rather than mouse events, because one set of
 * handlers then covers a mouse, a finger, and a stylus.
 */
export function CropCanvas({ file, size, box, onChange }: Props) {
  const [url, setUrl] = useState("");
  const frameRef = useRef<HTMLDivElement>(null);
  const grabRef = useRef<Grab | null>(null);

  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  /** Turns a movement on screen into a movement in the picture's own pixels. */
  const toPicture = useCallback(
    (dx: number, dy: number) => {
      const frame = frameRef.current;
      if (!frame) return { dx: 0, dy: 0 };
      const rect = frame.getBoundingClientRect();
      return {
        dx: (dx / rect.width) * size.width,
        dy: (dy / rect.height) * size.height,
      };
    },
    [size],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      const grab = grabRef.current;
      if (!grab) return;

      const moved = toPicture(
        event.clientX - (grab.kind === "move" ? grab.startX : grab.from.x),
        event.clientY - (grab.kind === "move" ? grab.startY : grab.from.y),
      );

      if (grab.kind === "move") {
        onChange({
          ...grab.from,
          x: clamp(
            Math.round(grab.from.x + moved.dx),
            0,
            size.width - grab.from.width,
          ),
          y: clamp(
            Math.round(grab.from.y + moved.dy),
            0,
            size.height - grab.from.height,
          ),
        });
        return;
      }

      const frame = frameRef.current;
      if (!frame) return;
      const rect = frame.getBoundingClientRect();
      const px = clamp(
        Math.round(((event.clientX - rect.left) / rect.width) * size.width),
        0,
        size.width,
      );
      const py = clamp(
        Math.round(((event.clientY - rect.top) / rect.height) * size.height),
        0,
        size.height,
      );

      const from = grab.from;
      const right = from.x + from.width;
      const bottom = from.y + from.height;

      // Each corner moves two edges and leaves the opposite corner where it
      // is. A minimum of eight pixels stops a crop collapsing to nothing,
      // which cannot be undone by dragging.
      const next: Box =
        grab.corner === "nw"
          ? {
              x: Math.min(px, right - 8),
              y: Math.min(py, bottom - 8),
              width: right - Math.min(px, right - 8),
              height: bottom - Math.min(py, bottom - 8),
            }
          : grab.corner === "ne"
            ? {
                x: from.x,
                y: Math.min(py, bottom - 8),
                width: Math.max(px - from.x, 8),
                height: bottom - Math.min(py, bottom - 8),
              }
            : grab.corner === "sw"
              ? {
                  x: Math.min(px, right - 8),
                  y: from.y,
                  width: right - Math.min(px, right - 8),
                  height: Math.max(py - from.y, 8),
                }
              : {
                  x: from.x,
                  y: from.y,
                  width: Math.max(px - from.x, 8),
                  height: Math.max(py - from.y, 8),
                };

      onChange(next);
    },
    [onChange, size, toPicture],
  );

  const stop = useCallback(() => {
    grabRef.current = null;
    removeEventListener("pointermove", onPointerMove);
    removeEventListener("pointerup", stop);
  }, [onPointerMove]);

  const start = useCallback(
    (grab: Grab) => {
      grabRef.current = grab;
      addEventListener("pointermove", onPointerMove);
      addEventListener("pointerup", stop);
    },
    [onPointerMove, stop],
  );

  useEffect(() => stop, [stop]);

  if (!url) return null;

  const percent = (value: number, total: number) => `${(value / total) * 100}%`;

  return (
    <div
      ref={frameRef}
      className="relative mt-4 w-full touch-none overflow-hidden rounded-lg border border-border bg-background/60 select-none"
      style={{ aspectRatio: `${size.width} / ${size.height}` }}
    >
      {/* Both copies are decorative. The picture itself is the visitor's own
          file, which they already know they chose, and the accessible way to
          set the crop is the numeric boxes below rather than this frame. */}
      <img
        src={url}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-45"
        draggable={false}
      />

      {/* The kept part, shown at full strength against the dimmed rest. */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: percent(box.x, size.width),
          top: percent(box.y, size.height),
          width: percent(box.width, size.width),
          height: percent(box.height, size.height),
        }}
      >
        <img
          src={url}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute max-w-none object-contain"
          draggable={false}
          style={{
            width: `${(size.width / box.width) * 100}%`,
            height: `${(size.height / box.height) * 100}%`,
            left: `${(-box.x / box.width) * 100}%`,
            top: `${(-box.y / box.height) * 100}%`,
          }}
        />
      </div>

      {/* The numeric boxes beside this are the accessible control. This frame
          is a pointer shortcut on top of them, so it is presentational. */}
      <div
        role="presentation"
        onPointerDown={(event) => {
          event.preventDefault();
          start({
            kind: "move",
            startX: event.clientX,
            startY: event.clientY,
            from: box,
          });
        }}
        className="absolute cursor-move rounded-xs border-2 border-primary shadow-[0_0_0_9999px_rgb(0_0_0/0.45)]"
        style={{
          left: percent(box.x, size.width),
          top: percent(box.y, size.height),
          width: percent(box.width, size.width),
          height: percent(box.height, size.height),
        }}
      >
        {HANDLES.map(({ corner, className, label }) => (
          <button
            key={corner}
            type="button"
            aria-label={`Drag the ${label} corner`}
            tabIndex={-1}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              start({ kind: "corner", corner, from: box });
            }}
            className={`absolute size-4 rounded-full border-2 border-primary bg-background ${className}`}
          />
        ))}
      </div>
    </div>
  );
}
