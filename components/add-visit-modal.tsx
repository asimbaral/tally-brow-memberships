"use client"

import type React from "react"
import { addVisit, STAFF_OPTIONS, LOCATION_OPTIONS, type Membership } from "@/lib/data"
import { getLocalDateString } from "@/lib/utils"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface AddVisitModalProps {
  isOpen: boolean
  onClose: () => void
  onVisitAdded: () => void
  membership: Membership
}

export function AddVisitModal({ isOpen, onClose, onVisitAdded, membership }: AddVisitModalProps) {
  const [formData, setFormData] = useState({
    date: getLocalDateString(),
    staffName: "",
    purchasedLocation: "",
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormData({
        date: getLocalDateString(),
        staffName: "",
        purchasedLocation: "",
      })
    }
  }, [isOpen])

  const willExpire = membership.remainingVisits === 1
  const canSubmit = formData.date && formData.staffName && formData.purchasedLocation && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    if (willExpire) {
      const confirmed = confirm(
        `This will be ${membership.user.name}'s final visit (${membership.maxVisits} of ${membership.maxVisits}) and their membership will expire. Continue?`
      )
      if (!confirmed) return
    }

    setSubmitting(true)
    try {
      await addVisit({
        membershipId: membership.id,
        date: formData.date,
        staffName: formData.staffName,
        purchasedLocation: formData.purchasedLocation,
      })

      toast.success(`Visit added for ${membership.user.name}`)
      onVisitAdded()
      onClose()
    } catch (error) {
      console.error("Error adding visit:", error)
      toast.error("Failed to add visit. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Visit — {membership.user.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-700">
            {membership.totalVisits} of {membership.maxVisits} visits used ·{" "}
            {membership.remainingVisits} remaining
          </div>

          {willExpire && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="text-yellow-800 text-sm">
                <strong>Heads up:</strong> this is the final visit — the membership will expire after it is added.
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
              <SelectTrigger id="staffName">
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
            <Label htmlFor="purchasedLocation">Location *</Label>
            <Select
              value={formData.purchasedLocation}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, purchasedLocation: value }))}
            >
              <SelectTrigger id="purchasedLocation">
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
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? "Adding…" : "Add Visit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
