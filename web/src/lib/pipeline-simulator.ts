import type { PipelineResult, ProposedFile } from './types'

const SAMPLE_PROMPTS: Record<string, string> = {
  compliance:
    'Conduct a comprehensive compliance and TCO migration audit for an enterprise client considering sovereign AI adoption.',
  legal:
    'Analyze data residency requirements for a mid-size law practice migrating document review workflows to private AI.',
  accounting:
    'Produce a cost-benefit analysis for an accounting firm replacing per-seat SaaS AI with BYOK sovereign infrastructure.',
}

function detectDomain(prompt: string): string {
  const lower = prompt.toLowerCase()
  if (lower.includes('law') || lower.includes('legal')) return 'legal'
  if (lower.includes('account') || lower.includes('audit')) return 'accounting'
  return 'compliance'
}

function formatBytes(chars: number): number {
  return new TextEncoder().encode('x'.repeat(chars)).length
}

export function simulatePipelineResult(prompt: string, elapsedSeconds: number): PipelineResult {
  const domain = detectDomain(prompt)
  const context = SAMPLE_PROMPTS[domain] ?? prompt

  const summaryMarkdown = `# Enterprise Analysis Summary

**Domain:** ${domain.charAt(0).toUpperCase() + domain.slice(1)}
**Generated:** ${new Date().toISOString()}
**Pipeline:** Antigravity → Gemini 3.5 Flash → HITL → Deliverables

## Executive Summary

${context}

### Key Findings

1. **Cost Optimization:** BYOK model reduces per-employee SaaS licensing to €0 fixed seats; token costs decrease ~80% vs. bundled enterprise AI subscriptions.
2. **Data Sovereignty:** All inference can remain within client-controlled infrastructure with human-approved artifact writes only.
3. **Compliance Posture:** HITL gate ensures zero autonomous file mutations — every deliverable requires explicit operator approval.

### Recommended Next Steps

- Deploy private workspace with firm-specific compliance templates
- Configure BYOK with Gemini API keys under client IAM policy
- Run pilot on highest-risk workflow (document review / audit automation)
`

  const proposedFiles: ProposedFile[] = [
    {
      filename: 'INDEX.md',
      description: 'Master index linking all numbered deliverables',
      sizeBytes: formatBytes(1200),
      content: `# Deliverable Index\n\n1. [Business Analysis](01_business_analysis.md)\n2. [TCO Model](02_tco_model.md)\n3. [Compliance Matrix](03_compliance_matrix.md)\n4. [Run Manifest](run_manifest.json)`,
    },
    {
      filename: '01_business_analysis.md',
      description: 'Comprehensive business and strategic analysis',
      sizeBytes: formatBytes(4500),
      content: `# Business Analysis\n\n## Current State\nEnterprise clients face rising per-seat AI costs and data residency concerns.\n\n## Target State\nSovereign BYOK architecture with HITL-controlled artifact generation.`,
    },
    {
      filename: '02_tco_model.md',
      description: 'Total cost of ownership comparison model',
      sizeBytes: formatBytes(2800),
      content: `# TCO Migration Model\n\n| Model | Annual Cost (50 seats) |\n|-------|------------------------|\n| Traditional SaaS AI | €180,000 |\n| Sovereign BYOK | €36,000 |\n| **Savings** | **80%** |`,
    },
    {
      filename: '03_compliance_matrix.md',
      description: 'Regulatory compliance mapping (GDPR, SOC2)',
      sizeBytes: formatBytes(3200),
      content: `# Compliance Matrix\n\n| Control | Status | Evidence |\n|---------|--------|----------|\n| Data residency | ✅ | BYOK + local writes |\n| HITL approval | ✅ | Gate enforced |\n| Audit trail | ✅ | run_manifest.json |`,
    },
    {
      filename: 'run_manifest.json',
      description: 'Machine-readable audit manifest for the pipeline run',
      sizeBytes: formatBytes(800),
      content: JSON.stringify(
        {
          run_id: crypto.randomUUID(),
          pipeline_version: '1.0.0',
          stages: ['antigravity', 'gemini-routing', 'hitl', 'deliverables'],
          approved: true,
          timestamp: new Date().toISOString(),
          artifact_count: 4,
        },
        null,
        2,
      ),
    },
  ]

  const artifacts = proposedFiles.map((f) => ({
    ...f,
    downloadUrl: undefined,
  }))

  const manifest = {
    run_id: crypto.randomUUID(),
    prompt_hash: btoa(prompt).slice(0, 16),
    elapsed_seconds: elapsedSeconds,
    artifacts: artifacts.map((a) => ({
      filename: a.filename,
      size_bytes: a.sizeBytes,
      sha256: 'simulated-' + a.filename.replace(/\W/g, ''),
    })),
    hitl_approved: true,
    generated_at: new Date().toISOString(),
  }

  return {
    summaryMarkdown,
    proposedFiles,
    artifacts,
    manifest,
    elapsedSeconds,
  }
}

export const PIPELINE_STAGE_LABELS = [
  { step: 1, key: 'antigravity', label: 'Antigravity Agent Deep Analysis', durationMs: 8000 },
  { step: 2, key: 'routing', label: 'Gemini 3.5 Flash Structuring & Routing', durationMs: 4000 },
  { step: 3, key: 'hitl', label: 'HITL Security Gate', durationMs: 0 },
  { step: 4, key: 'deliverables', label: 'Safe Deliverable Generation', durationMs: 2000 },
] as const
