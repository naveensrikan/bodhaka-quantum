"""Local Python helper for Bodhaka Quantum Summit.

The app passes IBM credentials through environment variables (QISKIT_IBM_TOKEN /
QISKIT_IBM_CHANNEL / QISKIT_IBM_INSTANCE), which qiskit-ibm-runtime reads automatically.
So this helper just confirms the connection and reads usage for the dashboard. User
programs are run directly (python <file>) with the same environment, so their code
stays standard Qiskit with no authentication lines.
"""
import sys
import json


def service():
    from qiskit_ibm_runtime import QiskitRuntimeService
    return QiskitRuntimeService()


def verify():
    out = {}
    try:
        s = service()
        try:
            out["backends"] = len(list(s.backends()))
        except Exception as e:
            out["error"] = str(e)
    except Exception as e:
        out["error"] = str(e)
    print(json.dumps(out, default=str))


def usage():
    out = {}
    try:
        s = service()
        try:
            out["jobs"] = len(list(s.jobs(limit=200)))
        except Exception as e:
            out["jobs_error"] = str(e)
        try:
            out["usage"] = s.usage()
        except Exception as e:
            out["usage_error"] = str(e)
    except Exception as e:
        out["error"] = str(e)
    print(json.dumps(out, default=str))


cmd = sys.argv[1] if len(sys.argv) > 1 else ""
if cmd == "verify":
    verify()
elif cmd == "usage":
    usage()
else:
    print(json.dumps({"error": "unknown command"}))
