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
import { Search } from "lucide-react"

interface AddMembershipModalProps {
  isOpen: boolean
  onClose: () => void
  onMembershipAdded: () => void
}

export function AddMembershipModal({ isOpen, onClose, onMembershipAdded }: AddMembershipModalProps) {
  const [step, setStep] = useState<"search" | "new" | "existing">("search")
  const [searchPhone, setSearchPhone] = useState("")
  const [existingClient, setExistingClient] = useState<{ name: string; phone: string; zipCode: string } | null>(null)
  const [servicesByCategory, setServicesByCategory] = useState<Record<string, string[]>>({})
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [loadingServices, setLoadingServices] = useState(false)

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
    // Clean phone number (remove formatting) before searching
    const cleanedPhone = searchPhone.replace(/[^\d]/g, "")
    const formattedPhone = formatPhoneNumber(searchPhone)
    
    // Search ALL users (not just those with memberships)
    const existingUser = await getUserByPhone(cleanedPhone)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !formData.name.trim() ||
      !formData.phone.trim() ||
      !formData.zipCode.trim() ||
      !formData.createdBy.trim() ||
      !formData.location.trim() ||
      formData.serviceTypes.length === 0
    ) {
      alert("Please fill in all required fields")
      return
    }

    try {
      // Format the data to match Membership interface
      await addMembership({
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
      onMembershipAdded()
      onClose()
    } catch (error) {
      console.error("Error adding membership:", error)
      alert("Failed to add membership. Please try again.")
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
                <Button onClick={handlePhoneSearch} disabled={searchPhone.length < 10}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-500">Enter phone number to check if client exists</p>
            </div>
          </div>
        )}

        {(step === "new" || step === "existing") && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === "existing" && existingClient && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 space-y-1">
                <p className="text-sm font-medium text-blue-900">Existing Client Found</p>
                <p className="text-sm text-blue-700">
                  {existingClient.name} - {existingClient.phone}
                </p>
                <p className="text-xs text-blue-600">Creating new membership for this client</p>
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
                  <Input id="phone" value={formData.phone} disabled className="bg-gray-50" />
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
              <div className="space-y-2 bg-gray-50 p-3 rounded-md">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{formData.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{formData.phone}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Zip Code:</span>
                  <span className="font-medium">{formData.zipCode}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Service Types * (Select all that apply)</Label>
              {loadingServices ? (
                <div className="text-sm text-gray-500 p-3">Loading services...</div>
              ) : Object.keys(servicesByCategory).length === 0 ? (
                <div className="text-sm text-gray-500 p-3">No services available</div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  {activeCategory && (
                    <div className="bg-gray-50 border-b p-3">
                      <p className="text-sm font-semibold text-gray-700 mb-2">{activeCategory}</p>
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
                              className={`min-h-[52px] px-4 py-2 rounded-lg border-2 text-base font-medium transition-colors ${
                                isSelected
                                  ? "bg-blue-50 border-blue-500 text-blue-900"
                                  : "bg-white border-gray-200 text-gray-700 hover:border-gray-400"
                              }`}
                            >
                              {service}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  <div className="divide-y max-h-[40vh] overflow-y-auto">
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
                            isActive ? "bg-blue-50" : "hover:bg-gray-50"
                          }`}
                        >
                          <span className={`text-base font-medium ${isActive ? "text-blue-900" : "text-gray-900"}`}>
                            {category}
                          </span>
                          <div className="flex items-center gap-2">
                            {selectedCount > 0 && (
                              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                                {selectedCount}
                              </span>
                            )}
                            <span className="text-gray-400 text-sm">{isActive ? "▼" : "▶"}</span>
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

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep("search")
                  setSearchPhone("")
                  setExistingClient(null)
                }}
              >
                Back
              </Button>
              <Button type="submit">Add Client</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
