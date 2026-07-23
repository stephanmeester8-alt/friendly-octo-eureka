export type SubscriptionTier = 'trial' | 'pilot' | 'pro' | 'enterprise'

export interface UserProfile {
  id: string
  email: string
  geminiApiKey?: string
  credits: number
  tier: SubscriptionTier
  trialUsed: boolean
  pilotRequested?: boolean
  createdAt: string
}

export interface ProposedFile {
  filename: string
  description: string
  sizeBytes: number
  content: string
}

export interface PipelineArtifact {
  filename: string
  description: string
  sizeBytes: number
  content: string
  downloadUrl?: string
}

export interface PipelineResult {
  summaryMarkdown: string
  proposedFiles: ProposedFile[]
  artifacts: PipelineArtifact[]
  manifest: Record<string, unknown>
  elapsedSeconds: number
}

export type PipelineStage =
  | 'idle'
  | 'antigravity'
  | 'routing'
  | 'hitl'
  | 'deliverables'
  | 'complete'
  | 'error'

export interface CreditPack {
  id: string
  name: string
  credits: number
  priceEur: number
  popular?: boolean
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: 'pack-10', name: 'Starter Pack', credits: 10, priceEur: 50 },
  { id: 'pack-25', name: 'Growth Pack', credits: 25, priceEur: 110, popular: true },
  { id: 'pack-50', name: 'Scale Pack', credits: 50, priceEur: 200 },
]

export interface PricingTier {
  id: string
  name: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  highlighted?: boolean
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'trial',
    name: 'Free Trial',
    price: '€0',
    period: 'one analysis',
    description: 'Evaluate the sovereign pipeline with a single enterprise-grade run.',
    features: [
      '1 free enterprise analysis',
      'Full HITL security gate',
      'Audit-ready artifact preview',
      'BYOK configuration',
    ],
    cta: 'Start Free Trial',
  },
  {
    id: 'pilot',
    name: 'Pilot Package',
    price: '€3.500',
    period: 'one-time',
    description: 'Private workspace setup plus one custom use case for your firm.',
    features: [
      'Dedicated workspace configuration',
      '1 custom use case implementation',
      'Onboarding workshop (2h)',
      'Priority support for 30 days',
    ],
    cta: 'Request Pilot',
    highlighted: true,
  },
  {
    id: 'pro',
    name: 'Pro Credits',
    price: '€50',
    period: 'per 10 analyses',
    description: 'Pay-as-you-go execution credits with no per-seat license fees.',
    features: [
      '10 deep enterprise analyses',
      '80% lower token costs via BYOK',
      'Unlimited team members',
      'Credit rollover 90 days',
    ],
    cta: 'Buy Credits',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: 'annual',
    description: 'For regulated industries requiring VPC, SSO, and custom SLAs.',
    features: [
      'Private VPC deployment',
      'SSO / SAML integration',
      'Custom compliance templates',
      'Dedicated solutions architect',
    ],
    cta: 'Contact Sales',
  },
]
