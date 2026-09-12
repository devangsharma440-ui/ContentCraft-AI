import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PLAN_CONFIG, type PlanType } from '@/lib/plans'
import { apiFetch, type UsageState } from '@/lib/api'
import { Check, Zap, Sparkles, Loader2, ShieldCheck } from 'lucide-react'

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUsage: UsageState | null
  onPlanChanged: (updatedUsage: UsageState) => void
}

export function UpgradeModal({
  open,
  onOpenChange,
  currentUsage,
  onPlanChanged,
}: UpgradeModalProps) {
  const [loading, setLoading] = useState(false)
  const isPro = currentUsage?.plan === 'pro'

  const handleSwitchPlan = async (targetPlan: PlanType) => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/plan/set-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: targetPlan }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        onPlanChanged({
          ...currentUsage!,
          plan: data.plan,
          name: data.name,
          used: data.used,
          limit: data.limit,
          remaining: data.remaining,
          period: data.period,
          priority: data.priority,
          priorityLabel: data.priorityLabel,
          badge: data.badge,
          badgeColor: data.badgeColor,
          features: data.features,
        })
        onOpenChange(false)
      }
    } catch {
      // network error
    } finally {
      setLoading(false)
    }
  }

  const freePlan = PLAN_CONFIG.free
  const proPlan = PLAN_CONFIG.pro

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="p-2 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-full">
              <Sparkles className="h-6 w-6" />
            </span>
          </div>
          <DialogTitle className="text-2xl md:text-3xl font-bold">
            Choose the Right Plan for You
          </DialogTitle>
          <DialogDescription className="text-sm md:text-base text-muted-foreground">
            Scale your content creation with higher monthly quotas and priority processing.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          {/* Free Plan Card */}
          <Card
            className={`relative flex flex-col justify-between border-2 transition-all ${
              !isPro ? 'border-primary shadow-sm' : 'border-border/60'
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold">{freePlan.name}</CardTitle>
                <Badge variant="secondary" className={freePlan.badgeColor}>
                  {freePlan.badge}
                </Badge>
              </div>
              <div className="mt-2">
                <span className="text-3xl font-extrabold">₹0</span>
                <span className="text-xs text-muted-foreground ml-1">/ month</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Perfect for casual creators and testing ideas.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="space-y-2 text-xs">
                {freePlan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                {!isPro ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full text-muted-foreground"
                    onClick={() => handleSwitchPlan('free')}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Switch to Free'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pro Plan Card */}
          <Card
            className={`relative flex flex-col justify-between border-2 transition-all bg-gradient-to-b from-card to-amber-500/5 ${
              isPro
                ? 'border-amber-500 shadow-md ring-1 ring-amber-500/50'
                : 'border-amber-400/70 hover:border-amber-500'
            }`}
          >
            <div className="absolute -top-3 right-4">
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none shadow-sm px-2.5 py-0.5 text-xs font-semibold">
                RECOMMENDED
              </Badge>
            </div>

            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <Zap className="h-5 w-5 fill-amber-500" />
                  {proPlan.name}
                </CardTitle>
                <Badge className={proPlan.badgeColor}>{proPlan.badge}</Badge>
              </div>
              <div className="mt-2 flex items-baseline">
                <span className="text-3xl font-extrabold text-foreground">₹499</span>
                <span className="text-xs text-muted-foreground ml-1">/ month</span>
                <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  (Early Bird)
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                For power creators, marketing pros & agencies.
              </p>
            </CardHeader>

            <CardContent className="space-y-4 pt-0">
              <div className="space-y-2 text-xs">
                {proPlan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <span className={feat.includes('Priority') ? 'font-semibold text-foreground' : ''}>
                      {feat}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                {isPro ? (
                  <Button
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                    disabled
                  >
                    ✓ Active Pro Plan
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-sm"
                    onClick={() => handleSwitchPlan('pro')}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2 fill-white" />
                    )}
                    Upgrade to Pro (Instant Activate)
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-muted/40 rounded-lg p-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>Payment architecture ready. Instant activation during test period. No credit card required.</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
