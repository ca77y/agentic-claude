export const meta = {
  name: 'deliver-repair',
  description: 'Fix review defects and pass a fresh QA on the shared implementation budget',
  whenToUse: 'Started by the deliver skill for a review round; not a direct entry point.',
  phases: [{ title: 'Spec' }, { title: 'Build' }, { title: 'Verify' }],
}

const input = typeof args === 'string' ? JSON.parse(args) : args || {}
return await workflow('slop-eng:deliver-gates', { ...input, mode: 'repair' })
