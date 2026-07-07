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
      <div className="text-center py-12">
        <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No memberships found</h3>
        <p className="text-gray-600">{emptyMessage || "Get started by adding your first membership"}</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-6 font-medium text-gray-900">Name</th>
              <th className="text-left py-3 px-6 font-medium text-gray-900">Phone</th>
              <th className="text-left py-3 px-6 font-medium text-gray-900">Services</th>
              <th className="text-left py-3 px-6 font-medium text-gray-900">Membership</th>
              <th className="text-left py-3 px-6 font-medium text-gray-900">Last Visit</th>
              <th className="text-left py-3 px-6 font-medium text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {memberships.map((membership) => {
              const lastVisit = lastVisits[membership.id]
              const isActive = membership.status === "active"
              const usedFraction = membership.maxVisits > 0 ? membership.totalVisits / membership.maxVisits : 0

              return (
                <tr
                  key={membership.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/client/${membership.id}`)}
                >
                  <td className="py-4 px-6">
                    <div className="font-medium text-gray-900">{membership.user.name}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4" />
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
                        <Badge variant={isActive ? "default" : "destructive"} className="text-xs w-fit">
                          {isActive ? "Active" : "Expired"}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {membership.totalVisits}/{membership.maxVisits} visits
                        </span>
                      </div>
                      <div className="h-1.5 w-full max-w-[130px] rounded-full bg-gray-200">
                        <div
                          className={`h-1.5 rounded-full ${isActive ? "bg-blue-500" : "bg-red-400"}`}
                          style={{ width: `${Math.min(100, usedFraction * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      {!visitsLoaded ? "…" : lastVisit ? formatLocalDate(lastVisit) : "Never"}
                    </div>
                  </td>
                  <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/client/${membership.id}`)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAddingVisitMembership(membership)}
                        className="flex items-center gap-1"
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
