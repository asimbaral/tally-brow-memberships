"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Eye, Plus, Phone, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AddVisitModal } from "./add-visit-modal"
import { type Client, getVisitsByClientId, getMembershipStatus } from "@/lib/data"
import { formatLocalDate } from "@/lib/utils"

interface ClientListProps {
  clients: Client[]
  onClientUpdate: () => void
}

interface ClientStats {
  totalVisits: number
  lastVisit: string | null
  membershipInfo: {
    status: "active" | "expired"
    remainingVisits: number
    totalVisits: number
  }
}

export function ClientList({ clients, onClientUpdate }: ClientListProps) {
  const router = useRouter()
  const [addingVisitClient, setAddingVisitClient] = useState<Client | null>(null)
  const [clientStats, setClientStats] = useState<Record<string, ClientStats>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadClientStats = async () => {
      setLoading(true)
      const stats: Record<string, ClientStats> = {}
      
      for (const client of clients) {
        const [visits, membershipInfo] = await Promise.all([
          getVisitsByClientId(client.id),
          getMembershipStatus(client.id),
        ])
        
        const totalVisits = visits.length
        const lastVisit = visits.length > 0
          ? visits.map((v) => v.date).sort().at(-1)!
          : null

        stats[client.id] = {
          totalVisits,
          lastVisit,
          membershipInfo,
        }
      }
      
      setClientStats(stats)
      setLoading(false)
    }

    if (clients.length > 0) {
      loadClientStats()
    } else {
      setLoading(false)
    }
  }, [clients])

  if (clients.length === 0) {
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
        <p className="text-gray-600">Get started by adding your first client</p>
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
                  Loading client data...
                </td>
              </tr>
            ) : (
              clients.map((client) => {
                const stats = clientStats[client.id]
                if (!stats) return null

                const { totalVisits, lastVisit, membershipInfo } = stats

                // Get active membership or most recent one for routing
                const activeMembership = client.memberships?.find(m => m.status === 'active') || client.memberships?.[0]
                const membershipId = activeMembership?.id || client.id // Fallback to client.id if no membership

                return (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">{client.name}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-4 w-4" />
                        {client.phone}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1">
                        {client.serviceTypes.map((service) => (
                          <Badge key={service} variant="secondary" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant={membershipInfo.status === "active" ? "default" : "destructive"}
                          className="text-xs w-fit"
                        >
                          {membershipInfo.status === "active" ? "Active" : "Expired"}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {membershipInfo.status === "active"
                            ? `${membershipInfo.remainingVisits} visits left`
                            : `${membershipInfo.totalVisits} visits used`}
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
                          onClick={() => router.push(`/client/${membershipId}`)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAddingVisitClient(client)}
                          className="flex items-center gap-1"
                          disabled={membershipInfo.status === "expired"}
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

      {addingVisitClient && (
        <AddVisitModal
          isOpen={true}
          onClose={() => setAddingVisitClient(null)}
          onVisitAdded={onClientUpdate}
          clientId={addingVisitClient.id}
        />
      )}
    </>
  )
}
