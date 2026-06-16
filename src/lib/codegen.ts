// The circuit model and the one job it has: turn dragged blocks into authentic,
// portable Qiskit. Nothing here is a custom DSL; the output runs unchanged in any
// standard Qiskit environment.

export type Op = { id: number; gate: string; qubits: number[]; param?: number }
export type Circuit = { n: number; ops: Op[]; measureAll: boolean }
export type Target = 'local' | 'ibm'

export const ONE_Q = ['h', 'x', 'y', 'z', 's', 't']
export const PARAM_Q = ['rx', 'ry', 'rz']
export const TWO_Q = ['cx', 'cz', 'swap']

const fmt = (x: number) => String(Number((x ?? 0).toFixed(4)))

function opLine(op: Op): string {
  if (PARAM_Q.includes(op.gate)) return `qc.${op.gate}(${fmt(op.param ?? 0)}, ${op.qubits[0]})`
  if (TWO_Q.includes(op.gate)) return `qc.${op.gate}(${op.qubits[0]}, ${op.qubits[1]})`
  return `qc.${op.gate}(${op.qubits[0]})`
}

export function toQiskit(c: Circuit, target: Target, shots = 1024): string {
  const head = ['from qiskit import QuantumCircuit, transpile']
  const body = [`qc = QuantumCircuit(${c.n})`, ...c.ops.map(opLine)]
  if (c.measureAll) body.push('qc.measure_all()')

  if (target === 'ibm') {
    head.push('from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2')
    return [
      ...head, '',
      ...body, '',
      'service = QiskitRuntimeService()',
      'backend = service.least_busy(operational=True, simulator=False)',
      'isa = transpile(qc, backend)',
      `result = SamplerV2(mode=backend).run([isa], shots=${shots}).result()`,
      'counts = result[0].data.meas.get_counts()',
      'print(counts)',
    ].join('\n')
  }

  head.push('from qiskit_aer import AerSimulator')
  return [
    ...head, '',
    ...body, '',
    'sim = AerSimulator()',
    `counts = sim.run(transpile(qc, sim), shots=${shots}).result().get_counts()`,
    'print(counts)',
  ].join('\n')
}
