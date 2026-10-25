"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Plus, Calendar, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AddVisitModal } from "@/components/add-visit-modal"
import { VisitStamps } from "@/components/membership-list"
import { Eyebrow, PageHero, SiteHeader } from "@/components/site-header"
import { type Visit, type Membership, getMembershipById, getVisitsByMembershipId } from "@/lib/data"
import { formatLocalDate } from "@/lib/utils"

export default function MembershipProfilePage() {
  const params = useParams()
  const router = useRouter()
  const membershipId = params.id as string

  const [membership, setMembership] = useState<Membership | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddVisitModalOpen, setIsAddVisitModalOpen] = useState(false)

  useEffect(() => {
    const loadMembership = async () => {
      setLoading(true)
      try {
        const [membershipData, visitsData] = await Promise.all([
          getMembershipById(membershipId),
          getVisitsByMembershipId(membershipId),
        ])
        setMembership(membershipData)
        setVisits(visitsData)
      } finally {
        setLoading(false)
      }
    }
    loadMembership()
  }, [membershipId])

  const handleVisitAdded = async () => {
    // Reload membership and visits
    const [membershipData, visitsData] = await Promise.all([
      getMembershipById(membershipId),
      getVisitsByMembershipId(membershipId),
    ])
    if (membershipData) {
      setMembership(membershipData)
    }
    setVisits(visitsData)
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="text-center py-24">
          <p className="type-script text-brand-ink">Just a moment…</p>
          <p className="type-small mt-1 text-ink-2">Loading membership</p>
        </div>
      </div>
    )
  }

  if (!membership) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="text-center py-24 px-4">
          <h2 className="type-title">Membership not found</h2>
          <Button onClick={() => router.push("/")} className="mt-6">
            Back to Membership List
          </Button>
        </div>
      </div>
    )
  }

  const sortedVisits = [...visits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const membershipServices = membership.services || []
  const isActive = membership.status === "active"

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <PageHero>
        <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="-ml-3">
          <ArrowLeft className="h-4 w-4" />
          All Memberships
        </Button>
        <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <Eyebrow>Membership details</Eyebrow>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <h1 className="type-display min-w-0 break-words">{membership.user.name}</h1>
              <Badge variant={isActive ? "success" : "destructive"}>{isActive ? "Active" : "Expired"}</Badge>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <VisitStamps used={membership.totalVisits} max={membership.maxVisits} active={isActive} />
              <span className="type-small text-ink-2 tabular-nums">
                {isActive
                  ? `${membership.remainingVisits} of ${membership.maxVisits} visits remaining`
                  : `Expired after ${membership.totalVisits} visits`}
              </span>
            </div>
          </div>
          {isActive && (
            <Button onClick={() => setIsAddVisitModalOpen(true)} size="lg" className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Visit
            </Button>
          )}
        </div>
      </PageHero>

      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Membership summary */}
          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle className="type-heading flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-brand-ink" />
                Membership
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <dl className="grid grid-cols-3 divide-x-2 divide-line rounded-[1.25rem] bg-surface-2 py-3 text-center">
                <Stat label="Used" value={membership.totalVisits} />
                <Stat label="Left" value={membership.remainingVisits} />
                <Stat label="Total" value={membership.maxVisits} />
              </dl>

              <section>
                <h2 className="type-eyebrow mb-2 text-brand-ink">Services</h2>
                {membershipServices.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {membershipServices.map((service) => (
                      <Badge key={service} variant="secondary">
                        {service}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="type-small text-ink-2">No services assigned</p>
                )}
              </section>

              <section>
                <h2 className="type-eyebrow mb-1 text-brand-ink">Client</h2>
                <dl className="divide-y-2 divide-line">
                  <DetailRow label="Phone" value={membership.phone} />
                  <DetailRow label="Zip code" value={membership.user.zipCode} />
                </dl>
              </section>

              <section>
                <h2 className="type-eyebrow mb-1 text-brand-ink">Record</h2>
                <dl className="divide-y-2 divide-line">
                  {membership.assignedTo && <DetailRow label="Sold by" value={membership.assignedTo} />}
                  <DetailRow label="Created" value={new Date(membership.created_at).toLocaleDateString()} />
                  <DetailRow label="Last updated" value={new Date(membership.updated_at).toLocaleDateString()} />
                </dl>
              </section>
            </CardContent>
          </Card>

          {/* Visit History */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-baseline justify-between gap-3">
                <CardTitle className="type-heading">Visit History</CardTitle>
                <span className="type-small text-ink-2 tabular-nums">
                  {sortedVisits.length} {sortedVisits.length === 1 ? "visit" : "visits"}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {sortedVisits.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-lilac text-lilac-ink">
                    <Calendar className="h-7 w-7" />
                  </div>
                  <h3 className="type-heading mb-2">No visits recorded</h3>
                  <p className="type-small text-ink-2 mb-5">Start tracking visits for this client</p>
                  <Button onClick={() => setIsAddVisitModalOpen(true)} disabled={!isActive}>
                    Add First Visit
                  </Button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-[1.25rem] border-2 border-line">
                  <div className="hidden grid-cols-[9rem_1fr_1fr] bg-surface-2 sm:grid">
                    <div className="px-4 py-3 type-eyebrow text-brand-ink">Date</div>
                    <div className="px-4 py-3 type-eyebrow text-brand-ink">Staff Member</div>
                    <div className="px-4 py-3 type-eyebrow text-brand-ink">Purchased Location</div>
                  </div>
                  <ol className="divide-y-2 divide-line sm:border-t-2 sm:border-line">
                    {sortedVisits.map((visit, i) => (
                      <li
                        key={visit.id}
                        className="grid grid-cols-[8.5rem_1fr] items-baseline gap-x-4 gap-y-0.5 px-4 py-3 transition-colors hover:bg-surface-2 sm:grid-cols-[9rem_1fr_1fr] sm:gap-0 sm:p-0"
                      >
                        <span className="row-span-2 flex items-center gap-2 text-sm tabular-nums whitespace-nowrap sm:row-span-1 sm:px-4 sm:py-3">
                          <span className="type-caption grid size-6 place-items-center rounded-full bg-brand-tint text-brand-ink sm:hidden">
                            {sortedVisits.length - i}
                          </span>
                          {formatLocalDate(visit.date)}
                        </span>
                        <span className="text-sm font-semibold sm:px-4 sm:py-3">{visit.staffName}</span>
                        <span className="type-small text-ink-2 sm:px-4 sm:py-3 sm:text-sm sm:text-ink">
                          {visit.purchasedLocation}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AddVisitModal
        isOpen={isAddVisitModalOpen}
        onClose={() => setIsAddVisitModalOpen(false)}
        onVisitAdded={handleVisitAdded}
        membership={membership}
      />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse gap-0.5">
      <dt className="type-caption text-ink-2">{label}</dt>
      <dd className="font-display text-2xl font-semibold tabular-nums leading-none">{value}</dd>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="type-small text-ink-2">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-right">{value}</dd>
    </div>
  )
}
