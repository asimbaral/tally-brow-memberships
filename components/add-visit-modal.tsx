"use client"

import type React from "react"
import { addVisit, STAFF_OPTIONS, getMembershipStatus, LOCATION_OPTIONS } from "@/lib/data"
import { getLocalDateString } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface AddVisitModalProps {
  isOpen: boolean
  onClose: () => void
  onVisitAdded: () => void
  clientId: string
}

export function AddVisitModal({ isOpen, onClose, onVisitAdded, clientId }: AddVisitModalProps) {
  const [formData, setFormData] = useState({
    date: getLocalDateString(),
    staffName: "",
    purchasedLocation: "",
  })
  const [membershipInfo, setMembershipInfo] = useState<{
    status: "active" | "expired"
    remainingVisits: number
    totalVisits: number
  } | null>(null)

  useEffect(() => {
    const loadMembershipInfo = async () => {
      if (isOpen && clientId) {
        const info = await getMembershipStatus(clientId)
        setMembershipInfo(info)
      }
    }
    loadMembershipInfo()
  }, [isOpen, clientId])

  const willExpire = membershipInfo?.remainingVisits === 1

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.staffName.trim()) {
      alert("Please select a staff member")
      return
    }

    if (!formData.purchasedLocation.trim()) {
      alert("Please select a purchased location")
      return
    }

    if (willExpire) {
      const confirmed = confirm("This will be the client's 6th visit and their membership will expire. Continue?")
      if (!confirmed) return
    }

    try {
      await addVisit({
        clientId,
        date: formData.date,
        staffName: formData.staffName,
        purchasedLocation: formData.purchasedLocation,
      })

      setFormData({
        date: getLocalDateString(),
        staffName: "",
        purchasedLocation: "",
      })

      onVisitAdded()
      onClose()
    } catch (error) {
      console.error("Error adding visit:", error)
      alert("Failed to add visit. Please try again.")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Visit</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {willExpire && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex">
                <div className="text-yellow-800 text-sm">
                  <strong>Warning:</strong> This will be the client's 6th visit and their membership will expire.
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="staffName">Staff Member *</Label>
            <Select
              value={formData.staffName}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, staffName: value }))}
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
            <Label htmlFor="purchasedLocation">Purchased Location *</Label>
            <Select
              value={formData.purchasedLocation}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, purchasedLocation: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_OPTIONS.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Add Visit</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
