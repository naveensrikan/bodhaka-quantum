"""Persistent Python engine for Bodhaka Quantum Summit.

Spawned once and kept warm. Heavy imports (Qiskit, Aer, matplotlib) and their caches
are built a single time at startup, so every program after that runs fast. The app
sends one JSON request per line on stdin and reads one JSON response per line on stdout.
Program output is captured and returned inside the JSON, so it never corrupts the protocol.
"""
import sys
import os
import io
import json
import importlib
import traceback
import re
import contextlib

# Make user-installed packages importable.
_pkg = os.environ.get("QSUMMIT_PKGDIR")
if _pkg and _pkg not in sys.path:
    sys.path.insert(0, _pkg)


def emit(obj):
    sys.__stdout__.write(json.dumps(obj) + "\n")
    sys.__stdout__.flush()


def run_program(req):
    code = req.get("code", "")
    env = req.get("env") or {}
    for k, v in env.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = str(v)
    importlib.invalidate_caches()  # pick up freshly installed packages
    buf = io.StringIO()
    ok = True
    missing = ""
    old_o, old_e = sys.stdout, sys.stderr
    sys.stdout = buf
    sys.stderr = buf
    try:
        exec(compile(code, "<program>", "exec"), {"__name__": "__main__"})
    except SystemExit:
        pass
    except BaseException:
        ok = False
        traceback.print_exc()
    finally:
        sys.stdout = old_o
        sys.stderr = old_e
    text = buf.getvalue()
    if not ok:
        m = re.search(r"No module named '([^']+)'", text)
        if m:
            missing = m.group(1).split(".")[0]
    return {"id": req.get("id"), "ok": ok, "stdout": text if ok else "", "stderr": "" if ok else text, "missing": missing}


def warm():
    # Build heavy imports and caches once, now, with output suppressed.
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        try:
            import qiskit  # noqa: F401
            from qiskit import QuantumCircuit, transpile  # noqa: F401
            from qiskit_aer import AerSimulator  # noqa: F401
        except BaseException:
            pass
        try:
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot  # noqa: F401
        except BaseException:
            pass


def main():
    warm()
    emit({"ready": True})
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except Exception:
            continue
        if req.get("cmd") == "quit":
            break
        emit(run_program(req))


main()
