from __future__ import annotations

import runpy
import sys

if __name__ == "__main__":
    sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parents[1]))
    runpy.run_module("worker.cli", run_name="__main__")
