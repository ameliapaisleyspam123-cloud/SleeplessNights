import { useCallback } from "react";
import { appClient } from "@/api/appClient";

/**
 * Hook for managing character assignment logic
 * Validates permissions and handles assignment/unassignment
 */
export function useCharacterAssignment() {
  /**
   * Assign a character to a player (DM only)
   */
  const assignCharacterToPlayer = useCallback(async (sheetId, playerEmail) => {
    if (!sheetId) return null;
    try {
      const updated = await appClient.entities.CharacterSheet.update(sheetId, {
        assigned_to_email: playerEmail,
      });
      return updated;
    } catch (error) {
      console.error("Error assigning character:", error);
      throw error;
    }
  }, []);

  /**
   * Unassign a character from any player (DM only)
   */
  const unassignCharacter = useCallback(async (sheetId) => {
    if (!sheetId) return null;
    try {
      const updated = await appClient.entities.CharacterSheet.update(sheetId, {
        assigned_to_email: "",
      });
      return updated;
    } catch (error) {
      console.error("Error unassigning character:", error);
      throw error;
    }
  }, []);

  /**
   * Player claims a character (only for unassigned)
   */
  const claimCharacter = useCallback(
    async (sheetId, playerEmail, campaign) => {
      if (!sheetId || !playerEmail) {
        return { success: false, error: "Missing required fields" };
      }

      try {
        const sheet = await appClient.entities.CharacterSheet.get(sheetId);

        // Check if character is available to claim
        if (sheet.assigned_to_email && sheet.assigned_to_email !== playerEmail) {
          return {
            success: false,
            error: "This character is already assigned to another player",
          };
        }

        // If already assigned to this player, return success
        if (sheet.assigned_to_email === playerEmail) {
          return { success: true };
        }

        // Check if player already has another character claimed
        const playerCharacters = await appClient.entities.CharacterSheet.filter(
          {
            campaign_id: sheet.campaign_id,
            assigned_to_email: playerEmail,
          }
        );

        if (playerCharacters.length > 0) {
          return {
            success: false,
            error: "You can only claim one character at a time",
          };
        }

        // Assign the character
        const updated = await appClient.entities.CharacterSheet.update(
          sheetId,
          {
            assigned_to_email: playerEmail,
          }
        );

        return { success: true, data: updated };
      } catch (error) {
        console.error("Error claiming character:", error);
        return { success: false, error: error.message };
      }
    },
    []
  );

  /**
   * Player unclaims their character
   */
  const unclaimCharacter = useCallback(async (sheetId, playerEmail) => {
    if (!sheetId || !playerEmail) {
      return { success: false, error: "Missing required fields" };
    }

    try {
      const sheet = await appClient.entities.CharacterSheet.get(sheetId);

      // Only allow unclaiming your own character
      if (sheet.assigned_to_email !== playerEmail) {
        return {
          success: false,
          error: "You can only unclaim your own character",
        };
      }

      const updated = await appClient.entities.CharacterSheet.update(sheetId, {
        assigned_to_email: "",
      });

      return { success: true, data: updated };
    } catch (error) {
      console.error("Error unclaiming character:", error);
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Check if player can roll initiative for a character
   * DM can roll for any character, players only for their assigned character
   */
  const canRollInitiativeForCharacter = useCallback(
    (sheet, currentUserEmail, isDM) => {
      if (isDM) return true;
      // Players can only roll for their assigned character
      return sheet.assigned_to_email === currentUserEmail;
    },
    []
  );

  /**
   * Get assignment status message
   */
  const getAssignmentStatus = useCallback((sheet, dmEmail) => {
    if (!sheet.assigned_to_email) {
      return "Unassigned - DM can assign to a player";
    }
    if (sheet.assigned_to_email === dmEmail) {
      return "Assigned to: DM (You)";
    }
    return `Assigned to: ${sheet.assigned_to_email}`;
  }, []);

  return {
    assignCharacterToPlayer,
    unassignCharacter,
    claimCharacter,
    unclaimCharacter,
    canRollInitiativeForCharacter,
    getAssignmentStatus,
  };
}
