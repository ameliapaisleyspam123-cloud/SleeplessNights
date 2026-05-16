import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, Loader2, Lock } from "lucide-react";
import { useCharacterAssignment } from "@/hooks/useCharacterAssignment";

/**
 * Character Claim Button - Player view
 * Allows players to claim a character (one at a time)
 */
export default function CharacterClaimButton({
  sheet,
  campaign,
  currentUserEmail,
  isDM,
  onClaimChange,
  userCharacterCounts = {},
}) {
  const [claiming, setClaiming] = useState(false);
  const { canClaimCharacter, claimCharacter } = useCharacterAssignment();

  const isAssignedToMe = sheet.assigned_to_email === currentUserEmail;
  const isUnassigned = !sheet.assigned_to_email;
  const canClaim = canClaimCharacter(
    sheet,
    currentUserEmail,
    isDM,
    userCharacterCounts
  );

  const handleClaim = async () => {
    setClaiming(true);
    const result = await claimCharacter(
      sheet.id,
      currentUserEmail,
      campaign
    );
    if (result.success) {
      onClaimChange?.();
    }
    setClaiming(false);
  };

  // DM always sees assignment status, players can claim or see status
  if (isDM) {
    if (isAssignedToMe || isUnassigned) {
      return (
        <Button
          size="sm"
          variant="outline"
          disabled={claiming}
          className="gap-1.5"
        >
          {claiming && <Loader2 className="w-3 h-3 animate-spin" />}
          <Users className="w-3.5 h-3.5" />
          {isAssignedToMe ? "Your Character" : "Unassigned"}
        </Button>
      );
    }
    return (
      <Button size="sm" variant="outline" disabled className="gap-1.5">
        <Lock className="w-3.5 h-3.5" />
        Assigned
      </Button>
    );
  }

  // Player view
  if (!canClaim) {
    if (isAssignedToMe) {
      return (
        <Button
          size="sm"
          variant="default"
          disabled
          className="gap-1.5 bg-accent text-accent-foreground"
        >
          <Users className="w-3.5 h-3.5" />
          Your Character
        </Button>
      );
    }
    return (
      <Button size="sm" variant="outline" disabled className="gap-1.5">
        <Lock className="w-3.5 h-3.5" />
        Already Claimed
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant={isAssignedToMe ? "default" : "outline"}
      onClick={handleClaim}
      disabled={claiming}
      className={`gap-1.5 ${
        isAssignedToMe ? "bg-accent text-accent-foreground border-accent" : ""
      }`}
    >
      {claiming ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Users className="w-3.5 h-3.5" />
      )}
      {isAssignedToMe ? "Your Character" : "Claim Character"}
    </Button>
  );
}
