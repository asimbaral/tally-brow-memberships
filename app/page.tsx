"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Plus, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MembershipList } from "@/components/membership-list"
import { AddMembershipModal } from "@/components/add-client-modal"
import { type Membership, type PaginatedMemberships, getMemberships, getAllServiceTypes } from "@/lib/data"

export default function HomePage() {
  const [paginatedData, setPaginatedData] = useState<PaginatedMemberships>({
    memberships: [],
    total: 0,
    page: 1,
    pageSize: 100,
    totalPages: 0,
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [serviceFilter, setServiceFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [allServiceTypes, setAllServiceTypes] = useState<string[]>([])

  // Debounced search function
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  const loadMemberships = useCallback(async (page: number, search: string, service: string, status: string) => {
    setLoading(true)
    try {
      const result = await getMemberships({
        page,
        pageSize: 50,
        searchTerm: search || undefined,
        serviceFilter: service !== "all" ? service : undefined,
        statusFilter: status !== "all" ? status : undefined,
      })
      setPaginatedData(result)
    } catch (error) {
      console.error("Error loading memberships:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load service types on mount
  useEffect(() => {
    setIsMounted(true)
    const loadServiceTypes = async () => {
      const services = await getAllServiceTypes()
      setAllServiceTypes(services)
    }
    loadServiceTypes()
    loadMemberships(1, "", "all", "all")
  }, [loadMemberships])

  // Handle search/filter changes with debounce
  useEffect(() => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }

    const timer = setTimeout(() => {
      const newPage = 1
      setCurrentPage(newPage)
      loadMemberships(newPage, searchTerm, serviceFilter, statusFilter)
    }, 500)

    setSearchDebounceTimer(timer)

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [searchTerm, serviceFilter, statusFilter, loadMemberships])

  // Handle page changes (only when page number changes)
  useEffect(() => {
    if (paginatedData.memberships.length === 0) return

    loadMemberships(currentPage, searchTerm, serviceFilter, statusFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage])

  const handleMembershipUpdate = async () => {
    await loadMemberships(currentPage, searchTerm, serviceFilter, statusFilter, locationFilter)
    const services = await getAllServiceTypes()
    setAllServiceTypes(services)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= paginatedData.totalPages) {
      setCurrentPage(newPage)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Salon Membership Tracker</h1>
            <p className="mt-2 text-gray-600">
              Manage your salon clients and track their visits. Each membership expires after 6 visits.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400 shrink-0" />
                  <Select value={serviceFilter} onValueChange={setServiceFilter}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="All Services" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Services</SelectItem>
                      {allServiceTypes.map((service) => (
                        <SelectItem key={service} value={service}>
                          {service}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add New Membership
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Loading memberships...</div>
            </div>
          ) : (
            <>
              <MembershipList memberships={paginatedData.memberships} onMembershipUpdate={handleMembershipUpdate} />
              
              {/* Pagination Controls */}
              {paginatedData.totalPages > 1 && (
                <div className="p-6 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {((paginatedData.page - 1) * paginatedData.pageSize) + 1} to{" "}
                    {Math.min(paginatedData.page * paginatedData.pageSize, paginatedData.total)} of{" "}
                    {paginatedData.total} memberships
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(paginatedData.page - 1)}
                      disabled={paginatedData.page === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, paginatedData.totalPages) }, (_, i) => {
                        let pageNum: number
                        if (paginatedData.totalPages <= 5) {
                          pageNum = i + 1
                        } else if (paginatedData.page <= 3) {
                          pageNum = i + 1
                        } else if (paginatedData.page >= paginatedData.totalPages - 2) {
                          pageNum = paginatedData.totalPages - 4 + i
                        } else {
                          pageNum = paginatedData.page - 2 + i
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={paginatedData.page === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            disabled={loading}
                            className="min-w-[40px]"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(paginatedData.page + 1)}
                      disabled={paginatedData.page === paginatedData.totalPages || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
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
