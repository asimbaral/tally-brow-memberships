"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addMembership, STAFF_OPTIONS, LOCATION_OPTIONS, getUserByPhone, getServices, formatPhoneNumberForDisplay } from "@/lib/data"
import { ChevronDown, Search } from "lucide-react"
import { toast } from "sonner"

interface AddMembershipModalProps {
  isOpen: boolean
  onClose: () => void
  onMembershipAdded: (membershipId: string) => void
}

export function AddMembershipModal({ isOpen, onClose, onMembershipAdded }: AddMembershipModalProps) {
  const [step, setStep] = useState<"search" | "new" | "existing">("search")
  const [searchPhone, setSearchPhone] = useState("")
  const [existingClient, setExistingClient] = useState<{ name: string; phone: string; zipCode: string } | null>(null)
  const [servicesByCategory, setServicesByCategory] = useState<Record<string, string[]>>({})
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [loadingServices, setLoadingServices] = useState(false)
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    zipCode: "",
    serviceTypes: [] as string[],
    createdBy: "",
    location: "",
    notes: "",
  })

  useEffect(() => {
    // Load services from Service table when component mounts
    const loadServices = async () => {
      setLoadingServices(true)
      try {
        const services = await getServices()
        // Group services by category
        const grouped: Record<string, string[]> = {}
        services.forEach((service) => {
          const category = service.Category
          if (!grouped[category]) {
            grouped[category] = []
          }
          if (!grouped[category].includes(service.Service)) {
            grouped[category].push(service.Service)
          }
        })
        // Sort categories and services within each category
        const sorted: Record<string, string[]> = {}
        Object.keys(grouped)
          .sort()
          .forEach((category) => {
            sorted[category] = grouped[category].sort()
          })
        setServicesByCategory(sorted)
        setActiveCategory(null)
      } catch (error) {
        console.error("Error loading services:", error)
        setServicesByCategory({})
      } finally {
        setLoadingServices(false)
      }
    }
    loadServices()
  }, [])

  useEffect(() => {
    if (isOpen) {
      // Reset to search step when modal opens
      setStep("search")
      setSearchPhone("")
      setExistingClient(null)
      setFormData({
        name: "",
        phone: "",
        zipCode: "",
        serviceTypes: [],
        createdBy: "",
        location: "",
        notes: "",
      })
    }
  }, [isOpen])

  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/[^\d]/g, "")
    const phoneNumberLength = phoneNumber.length

    if (phoneNumberLength < 4) return phoneNumber
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`
  }

  const handlePhoneSearch = async () => {
    if (searching) return
    // Clean phone number (remove formatting) before searching
    const cleanedPhone = searchPhone.replace(/[^\d]/g, "")
    const formattedPhone = formatPhoneNumber(searchPhone)

    setSearching(true)
    // Search ALL users (not just those with memberships)
    const existingUser = await getUserByPhone(cleanedPhone).finally(() => setSearching(false))

    if (existingUser) {
      // User exists, use existing user info
      // Format phone for display
      const displayPhone = formattedPhone || formatPhoneNumberForDisplay(existingUser.phoneNumber)
      setExistingClient({ 
        name: existingUser.name, 
        phone: displayPhone, 
        zipCode: existingUser.zipCode 
      })
      setFormData((prev) => ({
        ...prev,
        name: existingUser.name,
        phone: displayPhone,
        zipCode: existingUser.zipCode,
      }))
      setStep("existing")
    } else {
      // New user
      setFormData((prev) => ({ ...prev, phone: formattedPhone }))
      setStep("new")
    }
  }

  const missingFields = [
    !formData.name.trim() && "name",
    !formData.phone.trim() && "phone",
    !formData.zipCode.trim() && "zip code",
    formData.serviceTypes.length === 0 && "at least one service",
    !formData.createdBy.trim() && "created by",
    !formData.location.trim() && "location",
  ].filter(Boolean) as string[]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || missingFields.length > 0) return

    setSubmitting(true)
    try {
      // Format the data to match Membership interface
      const membershipId = await addMembership({
        name: formData.name,
        phoneNumber: formData.phone,
        zipCode: formData.zipCode,
        serviceTypes: formData.serviceTypes,
        createdBy: formData.createdBy,
        assignedTo: formData.createdBy,
        location: formData.location,
        notes: formData.notes,
        usesPhone: true,
        optedIn: false,
        agreedToTerms: false,
        business: "TallyBrowStudio",
        emailAddress: null,
      })
      toast.success(`Membership added for ${formData.name}`)
      onMembershipAdded(membershipId)
      onClose()
    } catch (error) {
      console.error("Error adding membership:", error)
      toast.error("Failed to add membership. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleServiceTypeChange = (category: string, service: string, checked: boolean) => {
    const serviceKey = `${category} - ${service}`
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        serviceTypes: [...prev.serviceTypes, serviceKey],
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        serviceTypes: prev.serviceTypes.filter((type) => type !== serviceKey),
      }))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Membership</DialogTitle>
        </DialogHeader>

        {step === "search" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="searchPhone">Phone Number</Label>
              <div className="flex gap-2">
                <Input
                  id="searchPhone"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(formatPhoneNumber(e.target.value))}
                  placeholder="(555) 123-4567"
                  maxLength={14}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handlePhoneSearch()
                    }
                  }}
                />
                <Button onClick={handlePhoneSearch} disabled={searchPhone.replace(/[^\d]/g, "").length < 10 || searching}>
                  <Search className="h-4 w-4" />
                  {searching ? "Searching…" : "Search"}
                </Button>
              </div>
              <p className="type-small text-ink-2">Enter phone number to check if client exists</p>
            </div>
          </div>
        )}

        {(step === "new" || step === "existing") && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === "existing" && existingClient && (
              <div className="rounded-[1.25rem] bg-lilac p-4 space-y-1">
                <p className="type-eyebrow text-lilac-ink">Existing client found</p>
                <p className="font-display text-lg font-semibold">
                  {existingClient.name} · <span className="tabular-nums">{existingClient.phone}</span>
                </p>
                <p className="type-caption text-ink-2">Creating a new membership for this client</p>
              </div>
            )}

            {step === "new" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter client's full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input id="phone" value={formData.phone} disabled className="bg-surface-2" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">Zip Code *</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData((prev) => ({ ...prev, zipCode: e.target.value.replace(/\D/g, "") }))}
                    placeholder="12345"
                    maxLength={5}
                    required
                  />
                </div>
              </>
            )}

            {step === "existing" && (
              <div className="tile space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-2">Name:</span>
                  <span className="font-medium">{formData.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-2">Phone:</span>
                  <span className="font-medium">{formData.phone}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-2">Zip Code:</span>
                  <span className="font-medium">{formData.zipCode}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Service Types * (Select all that apply)</Label>
              {loadingServices ? (
                <div className="type-small text-ink-2 p-3">Loading services...</div>
              ) : Object.keys(servicesByCategory).length === 0 ? (
                <div className="type-small text-ink-2 p-3">No services available</div>
              ) : (
                <div className="rounded-[1.25rem] border-2 border-lip-soft overflow-hidden">
                  {activeCategory && (
                    <div className="bg-surface-2 border-b-2 border-lip-soft p-3">
                      <p className="type-eyebrow text-brand-ink mb-2">{activeCategory}</p>
                      <div className="flex flex-wrap gap-2">
                        {servicesByCategory[activeCategory].map((service) => {
                          const serviceKey = `${activeCategory} - ${service}`
                          const isSelected = formData.serviceTypes.includes(serviceKey)
                          return (
                            <button
                              key={serviceKey}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => handleServiceTypeChange(activeCategory, service, !isSelected)}
                              className={`pressable min-h-[52px] px-4 py-2 rounded-full border-2 text-base font-semibold ${
                                isSelected
                                  ? "bg-brand-tint border-brand text-brand-ink"
                                  : "bg-surface border-lip-soft text-ink hover:border-brand/50"
                              }`}
                            >
                              {service}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  <div className="divide-y-2 divide-line max-h-[40vh] overflow-y-auto">
                    {Object.entries(servicesByCategory).map(([category, services]) => {
                      const selectedCount = services.filter((s) =>
                        formData.serviceTypes.includes(`${category} - ${s}`)
                      ).length
                      const isActive = activeCategory === category
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setActiveCategory(isActive ? null : category)}
                          className={`w-full flex items-center justify-between min-h-[56px] px-4 py-3 text-left transition-colors ${
                            isActive ? "bg-brand-tint" : "hover:bg-surface-2"
                          }`}
                        >
                          <span className={`text-base font-semibold ${isActive ? "text-brand-ink" : "text-ink"}`}>
                            {category}
                          </span>
                          <div className="flex items-center gap-2">
                            {selectedCount > 0 && (
                              <span className="bg-brand text-on-brand text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums">
                                {selectedCount}
                              </span>
                            )}
                            <ChevronDown className={`h-4 w-4 text-brand-ink transition-transform duration-[480ms] ease-spring ${isActive ? "" : "-rotate-90"}`} />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="createdBy">Created By *</Label>
              <Select
                value={formData.createdBy}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, createdBy: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_OPTIONS.map((staff) => (
                    <SelectItem key={staff} value={staff}>
                      {staff}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Select
                value={formData.location}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, location: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_OPTIONS.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes about the client..."
                rows={3}
              />
            </div>

            <div className="space-y-2 pt-4">
              {missingFields.length > 0 && (
                <p className="type-caption text-ink-2 text-right">
                  Still needed: {missingFields.join(", ")}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => {
                    setStep("search")
                    setSearchPhone("")
                    setExistingClient(null)
                  }}
                >
                  Back
                </Button>
                <Button type="submit" disabled={submitting || missingFields.length > 0}>
                  {submitting ? "Adding…" : "Add Membership"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
