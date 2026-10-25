"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Plus, Phone, User, Calendar, Hash, CreditCard } from "lucide-react"
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

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <PageHero>
        <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="-ml-3">
          <ArrowLeft className="h-4 w-4" />
          Back to Memberships
        </Button>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Eyebrow>Membership details</Eyebrow>
          <Badge variant={membership.status === "active" ? "success" : "destructive"}>
            {membership.status === "active" ? "Active" : "Expired"}
          </Badge>
        </div>
        <h1 className="type-display mt-4">{membership.user.name}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <VisitStamps used={membership.totalVisits} max={membership.maxVisits} active={membership.status === "active"} />
          <span className="type-small text-ink-2 tabular-nums">
            {membership.status === "active"
              ? `${membership.remainingVisits} of ${membership.maxVisits} visits remaining`
              : `Expired after ${membership.totalVisits} visits`}
          </span>
        </div>
      </PageHero>

      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Membership Info Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="type-heading flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-brand-ink" />
                  Membership Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="type-eyebrow text-brand-ink mb-2">Status</h4>
                  <div className="flex items-center gap-3">
                    <Badge variant={membership.status === "active" ? "success" : "destructive"}>
                      {membership.status === "active" ? "Active" : "Expired"}
                    </Badge>
                    <span className="text-sm text-ink-2">
                      {membership.status === "active"
                        ? `${membership.remainingVisits} visits remaining`
                        : `Expired after ${membership.totalVisits} visits`}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="type-eyebrow text-brand-ink mb-2">Visit Count</h4>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-ink-2">Total Visits:</span>
                      <span className="font-semibold tabular-nums">{membership.totalVisits}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-ink-2">Remaining:</span>
                      <span className="font-semibold tabular-nums">{membership.remainingVisits}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-ink-2">Maximum:</span>
                      <span className="font-semibold tabular-nums">{membership.maxVisits}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="type-eyebrow text-brand-ink mb-2">Services</h4>
                  {membershipServices.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {membershipServices.map((service) => (
                        <Badge key={service} variant="secondary">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-ink-2">No services assigned</p>
                  )}
                </div>

                <div className="border-t-2 border-line pt-4 space-y-2">
                  <div>
                    <h4 className="type-eyebrow text-brand-ink mb-1">Created</h4>
                    <p className="text-sm text-ink-2">{new Date(membership.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <h4 className="type-eyebrow text-brand-ink mb-1">Last Updated</h4>
                    <p className="text-sm text-ink-2">{new Date(membership.updated_at).toLocaleDateString()}</p>
                  </div>
                  {membership.assignedTo && (
                    <div>
                      <h4 className="type-eyebrow text-brand-ink mb-1">Sold By</h4>
                      <p className="text-sm text-ink-2">{membership.assignedTo}</p>
                    </div>
                  )}
                </div>

                {/* Client Info Section */}
                <div className="border-t-2 border-line pt-4 space-y-3">
                  <CardTitle className="font-display text-[1.0625rem] font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-brand-ink" />
                    Client Information
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-brand-ink" />
                    <span className="text-sm font-semibold tabular-nums">{membership.phone}</span>
                  </div>
                  <div>
                    <h4 className="type-eyebrow text-brand-ink mb-1">Zip Code</h4>
                    <p className="text-sm text-ink-2">{membership.user.zipCode}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Visit History */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="type-heading">Visit History</CardTitle>
                  <Button
                    onClick={() => setIsAddVisitModalOpen(true)}
                    disabled={membership.status === "expired"}
                  >
                    <Plus className="h-4 w-4" />
                    {membership.status === "expired" ? "Membership Expired" : "Add Visit"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {sortedVisits.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-lilac text-lilac-ink">
                      <Calendar className="h-7 w-7" />
                    </div>
                    <h3 className="type-heading mb-2">No visits recorded</h3>
                    <p className="type-small text-ink-2 mb-5">Start tracking visits for this client</p>
                    <Button onClick={() => setIsAddVisitModalOpen(true)} disabled={membership.status === "expired"}>
                      Add First Visit
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-[1.25rem] border-2 border-line">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-surface-2">
                          <th className="text-left py-3 px-4 type-eyebrow text-brand-ink">Date</th>
                          <th className="text-left py-3 px-4 type-eyebrow text-brand-ink">Staff Member</th>
                          <th className="text-left py-3 px-4 type-eyebrow text-brand-ink">Purchased Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-2 divide-line">
                        {sortedVisits.map((visit) => (
                          <tr key={visit.id} className="transition-colors hover:bg-surface-2">
                            <td className="py-3 px-4 text-sm tabular-nums whitespace-nowrap">{formatLocalDate(visit.date)}</td>
                            <td className="py-3 px-4 text-sm font-semibold">{visit.staffName}</td>
                            <td className="py-3 px-4 text-sm">{visit.purchasedLocation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
