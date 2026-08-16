import { useEffect, useState } from "react";
import { Dropzone } from "../../components/shell/Dropzone";
import {
  Field,
  NumberInput,
  RunButton,
  Select,
} from "../../components/shell/fields";
import { RunPanel } from "../../components/shell/RunPanel";
import { useToolRun } from "../../components/shell/useToolRun";
import type { ImageFormat } from "../../lib/image/codecs";
import { findTool } from "../registry";

const meta = findTool("crop-image");

type Box = {
  x: number | "";
  y: number | "";
  width: number | "";
  height: number | "";
};

export default function Tool() {
  const { state, run, reset, resultRef } = useToolRun("crop-image");
  const [files, setFiles] = useState<File[]>([]);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [box, setBox] = useState<Box>({ x: 0, y: 0, width: "", height: "" });
  const [target, setTarget] = useState<{
    width: number | "";
    height: number | "";
  }>({ width: "", height: "" });
  const [format, setFormat] = useState<ImageFormat>("png");

  // Read the real size as soon as a picture arrives, so the boxes below can be
  // filled in and the visitor is not guessing at numbers.
  useEffect(() => {
    const file = files[0];
    if (!file) {
      setSize(null);
      return;
    }
    let cancelled = false;
    createImageBitmap(file)
      .then((bitmap) => {
        if (cancelled) return;
        setSize({ width: bitmap.width, height: bitmap.height });
        setBox({ x: 0, y: 0, width: bitmap.width, height: bitmap.height });
        setTarget({ width: "", height: "" });
        bitmap.close();
      })
      .catch(() => setSize(null));
    return () => {
      cancelled = true;
    };
  }, [files]);

  const num = (value: number | "") => (value === "" ? 0 : value);

  const start = () => {
    const options: Record<string, unknown> = { format, quality: 90 };

    if (size) {
      const width = num(box.width) || size.width;
      const height = num(box.height) || size.height;
      const cropsSomething =
        num(box.x) > 0 ||
        num(box.y) > 0 ||
        width !== size.width ||
        height !== size.height;

      if (cropsSomething) {
        options.crop = { x: num(box.x), y: num(box.y), width, height };
      }
    }

    if (target.width !== "" && target.height !== "") {
      options.resize = { width: num(target.width), height: num(target.height) };
    }

    run(files, options);
  };

  return (
    <div>
      <Dropzone
        accept={meta?.accept}
        maxBytes={meta?.maxBytes}
        files={files}
        onChange={setFiles}
      />

      {size ? (
        <p className="mt-3 text-sm text-slate-500">
          This picture is {size.width} by {size.height} pixels.
        </p>
      ) : null}

      <fieldset className="mt-6" disabled={!size}>
        <legend className="text-sm font-semibold">Keep this rectangle</legend>
        <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="From the left">
            {(id) => (
              <NumberInput
                id={id}
                min={0}
                value={box.x}
                onChange={(x) => setBox({ ...box, x })}
              />
            )}
          </Field>
          <Field label="From the top">
            {(id) => (
              <NumberInput
                id={id}
                min={0}
                value={box.y}
                onChange={(y) => setBox({ ...box, y })}
              />
            )}
          </Field>
          <Field label="Width">
            {(id) => (
              <NumberInput
                id={id}
                min={1}
                value={box.width}
                onChange={(width) => setBox({ ...box, width })}
              />
            )}
          </Field>
          <Field label="Height">
            {(id) => (
              <NumberInput
                id={id}
                min={1}
                value={box.height}
                onChange={(height) => setBox({ ...box, height })}
              />
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className="mt-6" disabled={!size}>
        <legend className="text-sm font-semibold">
          Then change the size (optional)
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="New width">
            {(id) => (
              <NumberInput
                id={id}
                min={1}
                placeholder="leave blank"
                value={target.width}
                onChange={(width) => setTarget({ ...target, width })}
              />
            )}
          </Field>
          <Field label="New height">
            {(id) => (
              <NumberInput
                id={id}
                min={1}
                placeholder="leave blank"
                value={target.height}
                onChange={(height) => setTarget({ ...target, height })}
              />
            )}
          </Field>
          <Field label="Save as">
            {(id) => (
              <Select
                id={id}
                value={format}
                onChange={(value) => setFormat(value as ImageFormat)}
                options={[
                  { value: "png", label: "PNG" },
                  { value: "jpeg", label: "JPEG" },
                  { value: "webp", label: "WebP" },
                  { value: "avif", label: "AVIF" },
                ]}
              />
            )}
          </Field>
        </div>
      </fieldset>

      <div className="mt-6">
        <RunButton
          busy={state.busy}
          disabled={files.length === 0}
          onClick={start}
        >
          Apply
        </RunButton>
      </div>

      <RunPanel state={state} resultRef={resultRef} onReset={reset} />
    </div>
  );
}
