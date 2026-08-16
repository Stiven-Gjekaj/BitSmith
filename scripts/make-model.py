"""Converts the background removal model to half precision.

Run this by hand when the source model changes:

    python3 -m venv .venv
    .venv/bin/pip install onnx onnxconverter-common onnxruntime numpy
    .venv/bin/python scripts/make-model.py path/to/u2netp.onnx

The result is committed. No test and no build runs this script.

Why half precision, and not int8
--------------------------------
Int8 is the obvious choice and it is the wrong one for this model. Both kinds
were measured on the same picture, a disc on a flat ground, by comparing the
mean mask value inside the subject against the mean outside it:

    model         size      time    subject minus ground
    float32       4.36 MB    76 ms   0.995
    int8 static   1.29 MB    45 ms   0.000
    float16       2.26 MB    73 ms   0.995

Int8 is smaller and faster, and it returns a mask that says every pixel is
foreground. U-2-Net nests one encoder inside another and the activations
cover a wide range, which is the shape that int8 handles worst.

Half precision halves the download and keeps the model. It does not run
faster, because the runtime computes in single precision either way. The gain
is the download and nothing else, and the download is the part a visitor waits
for.
"""

import sys
from pathlib import Path

import onnx
from onnxconverter_common import float16

if len(sys.argv) < 2:
    print(__doc__)
    raise SystemExit(1)

source = Path(sys.argv[1])
target = Path("public/models/u2netp-fp16.onnx")

# The inputs and outputs stay single precision. The engine sends a Float32Array
# and reads one back, so keeping the edges unchanged means the calling code
# needs no knowledge of what happens inside.
converted = float16.convert_float_to_float16(onnx.load(str(source)), keep_io_types=True)
onnx.save(converted, str(target))

print(
    f"{source.name} {source.stat().st_size / 1048576:.2f} MB"
    f"  ->  {target.name} {target.stat().st_size / 1048576:.2f} MB"
)
