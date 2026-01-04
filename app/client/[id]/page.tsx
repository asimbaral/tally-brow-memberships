"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Plus, Phone, User, Calendar, Hash, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AddVisitModal } from "@/components/add-visit-modal"
import { type Client, type Visit, type Membership, getClientByMembershipId, getMembershipById, getVisitsByMembershipId } from "@/lib/data"

export default function MembershipProfilePage() {
  const params = useParams()
  const router = useRouter()
  const membershipId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [isAddVisitModalOpen, setIsAddVisitModalOpen] = useState(false)

  useEffect(() => {
    const loadMembership = async () => {
      // Get the specific membership
      const membershipData = await getMembershipById(membershipId)
      
      if (membershipData) {
        setMembership(membershipData)
        
        // Get client info for display
        const clientData = await getClientByMembershipId(membershipId)
        if (clientData) {
          setClient(clientData)
        }
        
        // Get visits for this specific membership
        const visitsData = await getVisitsByMembershipId(membershipId)
        setVisits(visitsData)
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

  if (!membership || !client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Membership not found</h2>
          <Button onClick={() => router.push("/")} className="mt-4">
            Back to Client List
          </Button>
        </div>
      </div>
    )
  }

  const sortedVisits = visits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const membershipServices = membership.services || []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Clients
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
                <p className="mt-1 text-gray-600">Membership Details</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Membership Info Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Membership Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                  <div className="flex items-center gap-3">
                    <Badge variant={membership.status === "active" ? "default" : "destructive"}>
                      {membership.status === "active" ? "Active" : "Expired"}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {membership.status === "active"
                        ? `${membership.remainingVisits} visits remaining`
                        : `Expired after ${membership.totalVisits} visits`}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Visit Count</h4>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Visits:</span>
                      <span className="font-medium">{membership.totalVisits}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Remaining:</span>
                      <span className="font-medium">{membership.remainingVisits}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Maximum:</span>
                      <span className="font-medium">{membership.maxVisits}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Services</h4>
                  {membershipServices.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {membershipServices.map((service) => (
                        <Badge key={service} variant="secondary">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No services assigned</p>
                  )}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Created</h4>
                    <p className="text-sm text-gray-600">{new Date(membership.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Last Updated</h4>
                    <p className="text-sm text-gray-600">{new Date(membership.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Client Info Section */}
                <div className="border-t pt-4 space-y-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Client Information
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">{client.phone}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1 text-sm">Zip Code</h4>
                    <p className="text-sm text-gray-600">{client.zipCode}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Visit History */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Visit History</CardTitle>
                  <Button
                    onClick={() => setIsAddVisitModalOpen(true)}
                    className="flex items-center gap-2"
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
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No visits recorded</h3>
                    <p className="text-gray-600 mb-4">Start tracking visits for this client</p>
                    <Button onClick={() => setIsAddVisitModalOpen(true)}>Add First Visit</Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Staff Member</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Purchased Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedVisits.map((visit) => (
                          <tr key={visit.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm">{new Date(visit.date).toLocaleDateString()}</td>
                            <td className="py-3 px-4 text-sm font-medium">{visit.staffName}</td>
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
        clientId={client.id}
      />
    </div>
  )
}
