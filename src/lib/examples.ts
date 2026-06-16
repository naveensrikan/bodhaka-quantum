export const LOCAL_EXAMPLE = `from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

qc = QuantumCircuit(2)
qc.h(0)
qc.cx(0, 1)
qc.measure_all()

sim = AerSimulator()
counts = sim.run(transpile(qc, sim), shots=1024).result().get_counts()
print(counts)`

export const IBM_EXAMPLE = `from qiskit import QuantumCircuit, transpile
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2

qc = QuantumCircuit(2)
qc.h(0)
qc.cx(0, 1)
qc.measure_all()

service = QiskitRuntimeService()
backend = service.least_busy(operational=True, simulator=False)
isa = transpile(qc, backend)
result = SamplerV2(mode=backend).run([isa], shots=1024).result()
counts = result[0].data.meas.get_counts()
print(counts)`
