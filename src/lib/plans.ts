// Centralized Plan Configuration for ContentCraft AI
// Single source of truth for plan limits, features, and capabilities.

export type PlanType = 'free' | 'pro'
export type PriorityLevel = 'standard' | 'pro'

export interface PlanDetails {
  id: PlanType
  name: string
  monthlyLimit: number
  priority: PriorityLevel
  priorityLabel: string
  maxHistory: number
  badge: string
  badgeColor: string
  features: string[]
  allowLongForm: boolean
  allowAdvancedOptions: boolean
  allowExport: boolean
}

export const PLAN_CONFIG: Record<PlanType, PlanDetails> = {
  free: {
    id: 'free',
    name: 'Free / Basic',
    monthlyLimit: 30,
    priority: 'standard',
    priorityLabel: 'Standard AI Processing',
    maxHistory: 15,
    badge: 'Free',
    badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    features: [
      '30 AI generations / month',
      'Standard generation priority',
      'Short & medium content length',
      'All 5 core AI tools',
      'Basic history (last 15 items)',
      'Normal processing speed',
    ],
    allowLongForm: false,
    allowAdvancedOptions: false,
    allowExport: true,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyLimit: 300,
    priority: 'pro',
    priorityLabel: '⚡ Priority AI Processing',
    maxHistory: 1000,
    badge: 'Pro',
    badgeColor: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm',
    features: [
      '300 AI generations / month',
      '⚡ Priority AI processing (faster queue path)',
      'Long-form content generation',
      'Advanced generation options',
      'Full history (up to 1,000 items)',
      'Instant download & print export',
      'All 5 core AI tools with enhanced depth',
      'Verified Pro badge',
    ],
    allowLongForm: true,
    allowAdvancedOptions: true,
    allowExport: true,
  },
}

export function getPlanConfig(plan: PlanType): PlanDetails {
  return PLAN_CONFIG[plan] || PLAN_CONFIG.free
}

export function getMonthlyLimit(plan: PlanType): number {
  return (PLAN_CONFIG[plan] || PLAN_CONFIG.free).monthlyLimit
}

export function getPriority(plan: PlanType): PriorityLevel {
  return (PLAN_CONFIG[plan] || PLAN_CONFIG.free).priority
}
