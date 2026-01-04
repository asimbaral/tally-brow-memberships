"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addClient, STAFF_OPTIONS, getClientsByPhone, getServices } from "@/lib/data"
import { Search } from "lucide-react"

interface AddClientModalProps {
  isOpen: boolean
  onClose: () => void
  onClientAdded: () => void
}

export function AddClientModal({ isOpen, onClose, onClientAdded }: AddClientModalProps) {
  const [step, setStep] = useState<"search" | "new" | "existing">("search")
  const [searchPhone, setSearchPhone] = useState("")
  const [existingClient, setExistingClient] = useState<{ name: string; phone: string; zipCode: string } | null>(null)
  const [servicesByCategory, setServicesByCategory] = useState<Record<string, string[]>>({})
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())
  const [loadingServices, setLoadingServices] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    zipCode: "",
    serviceTypes: [] as string[],
    createdBy: "",
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
        // Keep all categories closed initially
        setOpenCategories(new Set())
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
    const formattedPhone = formatPhoneNumber(searchPhone)
    const existingClients = await getClientsByPhone(formattedPhone)

    if (existingClients.length > 0) {
      // Phone exists, use existing client info
      const client = existingClients[0]
      setExistingClient({ name: client.name, phone: client.phone, zipCode: client.zipCode })
      setFormData((prev) => ({
        ...prev,
        name: client.name,
        phone: client.phone,
        zipCode: client.zipCode,
      }))
      setStep("existing")
    } else {
      // New client
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
      formData.serviceTypes.length === 0
    ) {
      alert("Please fill in all required fields")
      return
    }

    try {
      // Format the data to match Client interface
      await addClient({
        name: formData.name,
        phoneNumber: formData.phone,
        zipCode: formData.zipCode,
        serviceTypes: formData.serviceTypes,
        createdBy: formData.createdBy,
        notes: formData.notes,
        usesPhone: true,
        optedIn: false,
        agreedToTerms: false,
        business: "TallyBrowStudio",
        emailAddress: null,
      })
      onClientAdded()
      onClose()
    } catch (error) {
      console.error("Error adding client:", error)
      alert("Failed to add client. Please try again.")
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

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
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
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                  {Object.entries(servicesByCategory).map(([category, services]) => (
                    <div key={category} className="border-b last:border-b-0 pb-2 last:pb-0">
                      <button
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        <span className="font-medium text-sm text-gray-900">{category}</span>
                        <span className="text-xs text-gray-500">
                          {openCategories.has(category) ? "▼" : "▶"}
                        </span>
                      </button>
                      {openCategories.has(category) && (
                        <div className="grid grid-cols-2 gap-2 mt-2 pl-2">
                          {services.map((service) => {
                            const serviceKey = `${category} - ${service}`
                            return (
                              <div key={serviceKey} className="flex items-center space-x-2">
                                <Checkbox
                                  id={serviceKey}
                                  checked={formData.serviceTypes.includes(serviceKey)}
                                  onCheckedChange={(checked) =>
                                    handleServiceTypeChange(category, service, checked as boolean)
                                  }
                                />
                                <Label htmlFor={serviceKey} className="text-sm cursor-pointer">
                                  {service}
                                </Label>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
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
