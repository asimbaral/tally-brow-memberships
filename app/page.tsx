"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, ChevronLeft, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MembershipList } from "@/components/membership-list"
import { Eyebrow, PageHero, SiteHeader } from "@/components/site-header"
import { AddMembershipModal } from "@/components/add-client-modal"
import { type PaginatedMemberships, getMemberships, getAllServiceTypes } from "@/lib/data"

const PAGE_SIZE = 50

export default function HomePage() {
  const router = useRouter()
  const [paginatedData, setPaginatedData] = useState<PaginatedMemberships>({
    memberships: [],
    total: 0,
    page: 1,
    pageSize: PAGE_SIZE,
    totalPages: 0,
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [serviceFilter, setServiceFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [allServiceTypes, setAllServiceTypes] = useState<string[]>([])

  const loadMemberships = useCallback(async (page: number, search: string, service: string, status: string) => {
    setLoading(true)
    try {
      const result = await getMemberships({
        page,
        pageSize: PAGE_SIZE,
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

  // Initial load
  useEffect(() => {
    getAllServiceTypes().then(setAllServiceTypes)
    loadMemberships(1, "", "all", "all")
  }, [loadMemberships])

  // Reload (debounced) when search or filters change
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const timer = setTimeout(() => {
      setCurrentPage(1)
      loadMemberships(1, searchTerm, serviceFilter, statusFilter)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchTerm, serviceFilter, statusFilter, loadMemberships])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= paginatedData.totalPages && newPage !== currentPage) {
      setCurrentPage(newPage)
      loadMemberships(newPage, searchTerm, serviceFilter, statusFilter)
    }
  }

  const hasFilters = searchTerm.trim() !== "" || serviceFilter !== "all" || statusFilter !== "all"

  const clearFilters = () => {
    setSearchTerm("")
    setServiceFilter("all")
    setStatusFilter("all")
  }

  return (
    <div className="min-h-screen">
      <SiteHeader>
        <Button onClick={() => setIsAddModalOpen(true)} className="max-sm:hidden">
          <Plus className="h-4 w-4" />
          New Membership
        </Button>
      </SiteHeader>

      <PageHero>
        <Eyebrow>Six visits per membership</Eyebrow>
        <h1 className="type-display mt-4">
          Client <span className="squiggle text-brand-ink">memberships</span>
        </h1>
        <p className="type-lead mt-3 max-w-xl text-ink-2">
          Look up a client, log their visit, and see how many they have left. Each membership expires after 6 visits.
        </p>
        <Button onClick={() => setIsAddModalOpen(true)} size="lg" className="mt-6 w-full sm:hidden">
          <Plus className="h-4 w-4" />
          Add New Membership
        </Button>
      </PageHero>

      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="card overflow-hidden">
          <div className="flex flex-col gap-3 border-b-2 border-line p-4 sm:flex-row sm:items-center sm:p-6">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-ink" />
              <Input
                type="search"
                placeholder="Search by name or phone"
                aria-label="Search memberships"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-full sm:w-48" aria-label="Filter by service">
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
                <SelectTrigger className="w-full sm:w-36" aria-label="Filter by status">
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

          <div className="flex min-h-12 items-center justify-between gap-3 border-b-2 border-line px-4 py-2 sm:px-6">
            <p className="type-small text-ink-2 tabular-nums" aria-live="polite">
              {loading
                ? "Loading…"
                : `${paginatedData.total} ${paginatedData.total === 1 ? "membership" : "memberships"}${hasFilters ? " found" : ""}`}
            </p>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="-mr-3">
                <X className="h-4 w-4" />
                Clear filters
              </Button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-16">
              <p className="type-script text-brand-ink">Just a moment…</p>
              <p className="type-small mt-1 text-ink-2">Loading memberships</p>
            </div>
          ) : (
            <>
              <MembershipList
                memberships={paginatedData.memberships}
                emptyMessage={
                  hasFilters
                    ? "No memberships match your search or filters. Try clearing them."
                    : undefined
                }
              />

              {/* Pagination Controls */}
              {paginatedData.totalPages > 1 && (
                <div className="p-4 sm:p-6 border-t-2 border-line flex flex-wrap items-center justify-between gap-4">
                  <div className="type-small text-ink-2 tabular-nums">
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
                      <span className="max-sm:sr-only">Previous</span>
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
                            variant={paginatedData.page === pageNum ? "default" : "ghost"}
                            size="icon-sm"
                            onClick={() => handlePageChange(pageNum)}
                            disabled={loading}
                            aria-current={paginatedData.page === pageNum ? "page" : undefined}
                            className="tabular-nums"
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
                      <span className="max-sm:sr-only">Next</span>
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
        onMembershipAdded={(membershipId) => router.push(`/client/${membershipId}`)}
      />
    </div>
  )
}
