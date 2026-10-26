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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { VisitStamps } from "@/components/membership-list"

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
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setConfirming(false)
      setFormData({
        date: getLocalDateString(),
        staffName: "",
        purchasedLocation: "",
      })
    }
  }, [isOpen])

  const willExpire = membership.remainingVisits === 1
  const canSubmit = formData.date && formData.staffName && formData.purchasedLocation && !submitting

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault()
    if (canSubmit) setConfirming(true)
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
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
          <DialogTitle>Add Visit</DialogTitle>
          <DialogDescription>{membership.user.name}</DialogDescription>
        </DialogHeader>

        {confirming ? (
          <div className="space-y-4">
            <div className="rounded-[1.25rem] bg-lilac p-4">
              <p className="font-display text-lg font-semibold text-ink">
                Check the person ID and ensure it is {membership.user.name}.
              </p>
            </div>
            {willExpire && (
              <p className="type-small text-ink-2">
                This is their final visit ({membership.maxVisits} of {membership.maxVisits}). The membership will expire
                after it is added.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 pt-2 sm:flex sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
                {submitting ? "Adding…" : "Confirm"}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReview} className="space-y-4">
            <div className="tile flex flex-wrap items-center justify-between gap-3">
              <VisitStamps used={membership.totalVisits} max={membership.maxVisits} active />
              <span className="type-small text-ink-2 tabular-nums">
                {membership.totalVisits} of {membership.maxVisits} used · {membership.remainingVisits} left
              </span>
            </div>

            {willExpire && (
              <div className="rounded-[1.25rem] bg-butter p-4">
                <div className="type-small text-butter-ink">
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="staffName">Staff Member *</Label>
                <Select
                  value={formData.staffName}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, staffName: value }))}
                >
                  <SelectTrigger id="staffName" className="w-full">
                    <SelectValue placeholder="Select staff" />
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
                  <SelectTrigger id="purchasedLocation" className="w-full">
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
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 sm:flex sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                Confirm
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
