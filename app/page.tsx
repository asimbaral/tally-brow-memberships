"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MembershipList } from "@/components/membership-list"
import { AddMembershipModal } from "@/components/add-client-modal"
import { type Membership, getMemberships } from "@/lib/data"

export default function HomePage() {
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [serviceFilter, setServiceFilter] = useState("all")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const loadMemberships = async () => {
      const membershipsData = await getMemberships()
      setMemberships(membershipsData)
    }
    loadMemberships()
  }, [])

  const handleMembershipUpdate = async () => {
    const membershipsData = await getMemberships()
    setMemberships(membershipsData)
  }

  const filteredMemberships = memberships.filter((membership) => {
    const matchesSearch =
      membership.user.name.toLowerCase().includes(searchTerm.toLowerCase()) || membership.phone.includes(searchTerm)

    const matchesService =
      serviceFilter === "all" ||
      membership.serviceTypes.some((service) => service.toLowerCase().includes(serviceFilter.toLowerCase()))

    return matchesSearch && matchesService
  })

  // Only compute service types after mount to avoid hydration mismatch
  const allServiceTypes = isMounted 
    ? Array.from(new Set(memberships.flatMap((membership) => membership.serviceTypes)))
    : []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Salon Membership Tracker</h1>
            <p className="mt-2 text-gray-600">
              Manage your salon clients and track their visits. Each membership expires after 5 visits.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <Select value={serviceFilter} onValueChange={setServiceFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Services</SelectItem>
                      {allServiceTypes.map((service) => (
                        <SelectItem key={service} value={service.toLowerCase()}>
                          {service}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Membership
              </Button>
            </div>
          </div>

          <MembershipList memberships={filteredMemberships} onMembershipUpdate={handleMembershipUpdate} />
        </div>
      </div>

      <AddMembershipModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onMembershipAdded={handleMembershipUpdate}
      />
    </div>
  )
}
