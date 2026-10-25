"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Eye, Plus, Phone, Calendar, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AddVisitModal } from "./add-visit-modal"
import { type Membership, getLastVisitDates } from "@/lib/data"
import { formatLocalDate } from "@/lib/utils"

interface MembershipListProps {
  memberships: Membership[]
  onMembershipUpdate: () => void
  emptyMessage?: string
}

export function MembershipList({ memberships, onMembershipUpdate, emptyMessage }: MembershipListProps) {
  const router = useRouter()
  const [addingVisitMembership, setAddingVisitMembership] = useState<Membership | null>(null)
  const [lastVisits, setLastVisits] = useState<Record<string, string>>({})
  const [visitsLoaded, setVisitsLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    setVisitsLoaded(false)

    if (memberships.length === 0) {
      setLastVisits({})
      setVisitsLoaded(true)
      return
    }

    getLastVisitDates(memberships.map((m) => m.id)).then((dates) => {
      if (!cancelled) {
        setLastVisits(dates)
        setVisitsLoaded(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [memberships])

  if (memberships.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-lilac text-lilac-ink">
          <Users className="h-7 w-7" />
        </div>
        <h3 className="type-heading mb-2">No memberships found</h3>
        <p className="type-small text-ink-2">{emptyMessage || "Get started by adding your first membership"}</p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile card layout */}
      <div className="divide-y-2 divide-line md:hidden">
        {memberships.map((membership) => {
          const lastVisit = lastVisits[membership.id]
          const isActive = membership.status === "active"

          return (
            <div
              key={membership.id}
              className="p-4 transition-colors hover:bg-surface-2 active:bg-brand-tint cursor-pointer"
              onClick={() => router.push(`/client/${membership.id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-display text-lg font-semibold truncate">{membership.user.name}</div>
                  <div className="mt-1 flex items-center gap-1.5 type-small text-ink-2 tabular-nums">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-brand-ink" />
                    <span className="truncate">{membership.phone}</span>
                  </div>
                </div>
                <Badge variant={isActive ? "success" : "destructive"} className="shrink-0">
                  {isActive ? "Active" : "Expired"}
                </Badge>
              </div>

              {membership.serviceTypes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {membership.serviceTypes.map((service) => (
                    <Badge key={service} variant="secondary" className="text-xs">
                      {service}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center gap-3">
                <VisitStamps used={membership.totalVisits} max={membership.maxVisits} active={isActive} />
                <span className="type-caption text-ink-2 tabular-nums">
                  {membership.totalVisits}/{membership.maxVisits} visits
                </span>
              </div>

              <div className="mt-3 flex items-center gap-1.5 type-small text-ink-2">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-brand-ink" />
                Last visit: {!visitsLoaded ? "…" : lastVisit ? formatLocalDate(lastVisit) : "Never"}
              </div>

              <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/client/${membership.id}`)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddingVisitMembership(membership)}
                  className="flex-1"
                  disabled={!isActive}
                  title={!isActive ? "This membership has expired" : undefined}
                >
                  <Plus className="h-4 w-4" />
                  Add Visit
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop table layout */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead className="bg-surface-2">
            <tr>
              <th className="text-left py-3 px-6 type-eyebrow text-brand-ink">Name</th>
              <th className="text-left py-3 px-6 type-eyebrow text-brand-ink">Phone</th>
              <th className="text-left py-3 px-6 type-eyebrow text-brand-ink">Services</th>
              <th className="text-left py-3 px-6 type-eyebrow text-brand-ink">Membership</th>
              <th className="text-left py-3 px-6 type-eyebrow text-brand-ink">Last Visit</th>
              <th className="text-left py-3 px-6 type-eyebrow text-brand-ink">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-line">
            {memberships.map((membership) => {
              const lastVisit = lastVisits[membership.id]
              const isActive = membership.status === "active"
    
              return (
                <tr
                  key={membership.id}
                  className="transition-colors hover:bg-surface-2 cursor-pointer"
                  onClick={() => router.push(`/client/${membership.id}`)}
                >
                  <td className="py-4 px-6">
                    <div className="font-display text-[1.0625rem] font-semibold">{membership.user.name}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-ink-2 tabular-nums whitespace-nowrap">
                      <Phone className="h-4 w-4 text-brand-ink" />
                      {membership.phone}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1">
                      {membership.serviceTypes.map((service) => (
                        <Badge key={service} variant="secondary" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col gap-1.5 min-w-[130px]">
                      <div className="flex items-center gap-2">
                        <Badge variant={isActive ? "success" : "destructive"}>
                          {isActive ? "Active" : "Expired"}
                        </Badge>
                        <span className="type-caption text-ink-2 tabular-nums">
                          {membership.totalVisits}/{membership.maxVisits} visits
                        </span>
                      </div>
                      <VisitStamps used={membership.totalVisits} max={membership.maxVisits} active={isActive} />
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-ink-2 whitespace-nowrap">
                      <Calendar className="h-4 w-4 text-brand-ink" />
                      {!visitsLoaded ? "…" : lastVisit ? formatLocalDate(lastVisit) : "Never"}
                    </div>
                  </td>
                  <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/client/${membership.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAddingVisitMembership(membership)}
                        disabled={!isActive}
                        title={!isActive ? "This membership has expired" : undefined}
                      >
                        <Plus className="h-4 w-4" />
                        Add Visit
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {addingVisitMembership && (
        <AddVisitModal
          isOpen={true}
          onClose={() => setAddingVisitMembership(null)}
          onVisitAdded={onMembershipUpdate}
          membership={addingVisitMembership}
        />
      )}
    </>
  )
}

// One stamp per visit, like the paper loyalty card at the front desk. Falls back to a
// bar if a membership ever allows more visits than fit comfortably in a row.
export function VisitStamps({ used, max, active }: { used: number; max: number; active: boolean }) {
  if (max > 12) {
    const fraction = max > 0 ? Math.min(1, used / max) : 0
    return (
      <div className="h-2 w-full max-w-[130px] rounded-full bg-surface-2">
        <div className={`h-2 rounded-full ${active ? "bg-brand" : "bg-danger"}`} style={{ width: `${fraction * 100}%` }} />
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`size-3.5 rounded-full ${
            i < used
              ? active
                ? "bg-brand shadow-[0_1.5px_0_var(--lip)]"
                : "bg-danger/70"
              : "bg-surface-2 shadow-[inset_0_0_0_1.5px_var(--lip-soft)]"
          }`}
        />
      ))}
    </div>
  )
}
