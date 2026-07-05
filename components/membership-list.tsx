"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Eye, Plus, Phone, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AddVisitModal } from "./add-visit-modal"
import { type Membership, getVisitsByMembershipId } from "@/lib/data"
import { formatLocalDate } from "@/lib/utils"

interface MembershipListProps {
  memberships: Membership[]
  onMembershipUpdate: () => void
}

interface MembershipStats {
  totalVisits: number
  lastVisit: string | null
}

export function MembershipList({ memberships, onMembershipUpdate }: MembershipListProps) {
  const router = useRouter()
  const [addingVisitMembership, setAddingVisitMembership] = useState<Membership | null>(null)
  const [membershipStats, setMembershipStats] = useState<Record<string, MembershipStats>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadMembershipStats = async () => {
      setLoading(true)
      const stats: Record<string, MembershipStats> = {}
      
      for (const membership of memberships) {
        const visits = await getVisitsByMembershipId(membership.id)
        
        const totalVisits = visits.length
        const lastVisit = visits.length > 0
          ? visits.map((v) => v.date).sort().at(-1)!
          : null

        stats[membership.id] = {
          totalVisits,
          lastVisit,
        }
      }
      
      setMembershipStats(stats)
      setLoading(false)
    }

    if (memberships.length > 0) {
      loadMembershipStats()
    } else {
      setLoading(false)
    }
  }, [memberships])

  if (memberships.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No memberships found</h3>
        <p className="text-gray-600">Get started by adding your first membership</p>
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
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  Loading membership data...
                </td>
              </tr>
            ) : (
              memberships.map((membership) => {
                const stats = membershipStats[membership.id]
                if (!stats) return null

                const { totalVisits, lastVisit } = stats

                return (
                  <tr key={membership.id} className="hover:bg-gray-50">
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
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant={membership.status === "active" ? "default" : "destructive"}
                          className="text-xs w-fit"
                        >
                          {membership.status === "active" ? "Active" : "Expired"}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {membership.status === "active"
                            ? `${membership.remainingVisits} visits left`
                            : `${membership.totalVisits} visits used`}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {lastVisit ? formatLocalDate(lastVisit) : "Never"}
                      </div>
                    </td>
                    <td className="py-4 px-6">
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
                          disabled={membership.status === "expired"}
                        >
                          <Plus className="h-4 w-4" />
                          Add Visit
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {addingVisitMembership && (
        <AddVisitModal
          isOpen={true}
          onClose={() => setAddingVisitMembership(null)}
          onVisitAdded={onMembershipUpdate}
          clientId={addingVisitMembership.user.id}
        />
      )}
    </>
  )
}

