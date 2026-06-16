"""Local Python helper for Bodhaka Quantum Summit.

The app calls this for the two things user programs should NOT have to write by hand:
saving the IBM account once, and reading usage for the dashboard. User programs
themselves are run directly (python <file>), so the code stays standard Qiskit.
"""
import sys
import json


def save_account():
    data = json.load(sys.stdin)
    from qiskit_ibm_runtime import QiskitRuntimeService
    kw = dict(channel="ibm_quantum_platform", token=data["token"], overwrite=True, set_as_default=True)
    inst = (data.get("crn") or "").strip() or (data.get("instance") or "").strip()
    if inst:
        kw["instance"] = inst
    QiskitRuntimeService.save_account(**kw)
    print(json.dumps({"ok": True}))


def usage():
    out = {}
    try:
        from qiskit_ibm_runtime import QiskitRuntimeService
        svc = QiskitRuntimeService()
        try:
            out["jobs"] = len(list(svc.jobs(limit=200)))
        except Exception as e:
            out["jobs_error"] = str(e)
        try:
            out["usage"] = svc.usage()
        except Exception as e:
            out["usage_error"] = str(e)
        try:
            out["backends"] = [b.name for b in svc.backends()][:25]
        except Exception as e:
            out["backends_error"] = str(e)
    except Exception as e:
        out["error"] = str(e)
    print(json.dumps(out, default=str))


cmd = sys.argv[1] if len(sys.argv) > 1 else ""
if cmd == "save-account":
    save_account()
elif cmd == "usage":
    usage()
else:
    print(json.dumps({"error": "unknown command"}))
