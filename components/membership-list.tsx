"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Plus, Phone, Calendar, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AddVisitModal } from "./add-visit-modal"
import { type Membership, getLastVisitDates } from "@/lib/data"
import { formatLocalDate } from "@/lib/utils"

interface MembershipListProps {
  memberships: Membership[]
  emptyMessage?: string
}

export function MembershipList({ memberships, emptyMessage }: MembershipListProps) {
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

  const lastVisitLabel = (id: string) => {
    if (!visitsLoaded) return "…"
    const lastVisit = lastVisits[id]
    return lastVisit ? formatLocalDate(lastVisit) : "Never"
  }

  return (
    <>
      {/* Mobile card layout — the whole card opens the membership; one action stays visible */}
      <ul className="divide-y-2 divide-line md:hidden">
        {memberships.map((membership) => {
          const isActive = membership.status === "active"

          return (
            <li
              key={membership.id}
              className="cursor-pointer px-4 py-4 transition-colors duration-100 hover:bg-surface-2 active:bg-brand-tint"
              onClick={() => router.push(`/client/${membership.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/client/${membership.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block truncate font-display text-lg font-semibold leading-tight"
                  >
                    {membership.user.name}
                  </Link>
                  <div className="mt-1 flex items-center gap-1.5 type-small text-ink-2 tabular-nums">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-brand-ink" />
                    <span className="truncate">{membership.phone}</span>
                  </div>
                </div>
                <StatusBadge active={isActive} />
                <ChevronRight className="h-5 w-5 shrink-0 text-ink-2" aria-hidden />
              </div>

              {membership.serviceTypes.length > 0 && (
                <ServiceBadges services={membership.serviceTypes} className="mt-3" />
              )}

              <div className="mt-3 flex items-center justify-between gap-3">
                <VisitProgress used={membership.totalVisits} max={membership.maxVisits} active={isActive} />
                <span className="flex items-center gap-1.5 type-caption text-ink-2 tabular-nums whitespace-nowrap">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-brand-ink" />
                  {lastVisitLabel(membership.id)}
                </span>
              </div>

              {isActive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setAddingVisitMembership(membership)
                  }}
                  className="mt-4 w-full"
                >
                  <Plus className="h-4 w-4" />
                  Add Visit
                </Button>
              )}
            </li>
          )
        })}
      </ul>

      {/* Desktop table layout */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[24%]" />
            <col />
            <col className="w-[11.5rem]" />
            <col className="w-[9.5rem] max-lg:hidden" />
            <col className="w-[10.5rem]" />
          </colgroup>
          <thead className="bg-surface-2">
            <tr>
              <th className="py-3 pl-6 pr-4 text-left type-eyebrow text-brand-ink">Client</th>
              <th className="px-4 py-3 text-left type-eyebrow text-brand-ink">Services</th>
              <th className="px-4 py-3 text-left type-eyebrow text-brand-ink">Visits</th>
              <th className="px-4 py-3 text-left type-eyebrow text-brand-ink max-lg:hidden">Last Visit</th>
              <th className="py-3 pl-4 pr-6 text-right type-eyebrow text-brand-ink">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-line">
            {memberships.map((membership) => {
              const isActive = membership.status === "active"

              return (
                <tr
                  key={membership.id}
                  className="group cursor-pointer align-middle transition-colors duration-100 hover:bg-surface-2 active:bg-brand-tint"
                  onClick={() => router.push(`/client/${membership.id}`)}
                >
                  <td className="py-4 pl-6 pr-4">
                    <Link
                      href={`/client/${membership.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="block truncate font-display text-[1.0625rem] font-semibold leading-tight hover:text-brand-ink"
                    >
                      {membership.user.name}
                    </Link>
                    <div className="mt-1 flex items-center gap-1.5 type-small text-ink-2 tabular-nums whitespace-nowrap">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-brand-ink" />
                      {membership.phone}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {membership.serviceTypes.length > 0 ? (
                      <ServiceBadges services={membership.serviceTypes} />
                    ) : (
                      <span className="type-small text-ink-2">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-start gap-1.5">
                      <StatusBadge active={isActive} />
                      <VisitProgress used={membership.totalVisits} max={membership.maxVisits} active={isActive} />
                    </div>
                  </td>
                  <td className="px-4 py-4 max-lg:hidden">
                    <div className="flex items-center gap-1.5 type-small text-ink-2 tabular-nums whitespace-nowrap">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-brand-ink" />
                      {lastVisitLabel(membership.id)}
                    </div>
                  </td>
                  <td className="py-4 pl-4 pr-6" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {isActive && (
                        <Button variant="outline" size="sm" onClick={() => setAddingVisitMembership(membership)}>
                          <Plus className="h-4 w-4" />
                          Add Visit
                        </Button>
                      )}
                      <ChevronRight
                        className="h-5 w-5 shrink-0 text-ink-2 transition-transform duration-100 group-hover:translate-x-0.5"
                        aria-hidden
                      />
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
          onVisitAdded={() => router.push(`/client/${addingVisitMembership.id}`)}
          membership={addingVisitMembership}
        />
      )}
    </>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "success" : "destructive"} className="shrink-0">
      {active ? "Active" : "Expired"}
    </Badge>
  )
}

function ServiceBadges({ services, className = "" }: { services: string[]; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {services.map((service) => (
        <Badge key={service} variant="secondary" className="max-w-full truncate text-xs">
          {service}
        </Badge>
      ))}
    </div>
  )
}

// Stamps and their count read as one unit, so they never wrap apart.
export function VisitProgress({ used, max, active }: { used: number; max: number; active: boolean }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <VisitStamps used={used} max={max} active={active} />
      <span className="type-caption text-ink-2 tabular-nums">
        {used}/{max}
      </span>
    </div>
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
