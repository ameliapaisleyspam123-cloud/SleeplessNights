import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Users, X } from "lucide-react";
import { useCharacterAssignment } from "@/hooks/useCharacterAssignment";

/**
 * Character Assignment Panel - DM can assign characters to players
 */
export default function CharacterAssignmentPanel({
  sheet,
  campaign,
  onAssignmentChange,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { assignCharacterToPlayer, unassignCharacter, getAssignmentStatus } =
    useCharacterAssignment();

  if (!campaign?.player_emails || campaign.player_emails.length === 0) {
    return null;
  }

  const assignedStatus = getAssignmentStatus(sheet);
  const isAssigned = sheet.assigned_to_email && sheet.assigned_to_email !== "";

  const handleAssign = async (playerEmail) => {
    setIsLoading(true);
    setError(null);
    try {
      const updated = await assignCharacterToPlayer(sheet.id, playerEmail);
      if (onAssignmentChange) {
        onAssignmentChange(updated);
      }
      setIsOpen(false);
    } catch (err) {
      setError(err.message || "Failed to assign character");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassign = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const updated = await unassignCharacter(sheet.id);
      if (onAssignmentChange) {
        onAssignmentChange(updated);
      }
      setIsOpen(false);
    } catch (err) {
      setError(err.message || "Failed to unassign character");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className="gap-1.5"
      >
        <Users className="w-3.5 h-3.5" />
        {isAssigned ? "Assigned" : "Assign Player"}
      </Button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 z-50 w-48 border border-border rounded-sm bg-card shadow-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase text-muted-foreground">
              Assign to Player
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {error && (
            <div className="mb-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
              {error}
            </div>
          )}

          {isAssigned && (
            <div className="mb-3 pb-2 border-b border-border">
              <div className="text-[11px] text-muted-foreground mb-1">
                Currently Assigned To:
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium break-all">
                  {sheet.assigned_to_email}
                </span>
                <button
                  onClick={handleUnassign}
                  disabled={isLoading}
                  className="text-red-400 hover:text-red-300 disabled:opacity-50 text-xs font-medium ml-2 shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    "Unassign"
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1">
            {campaign.player_emails.map((playerEmail) => (
              <button
                key={playerEmail}
                onClick={() => handleAssign(playerEmail)}
                disabled={isLoading}
                className="w-full text-left px-2 py-1.5 text-xs rounded border border-border hover:bg-secondary disabled:opacity-50 transition-colors"
              >
                <div className="font-medium truncate">{playerEmail}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
