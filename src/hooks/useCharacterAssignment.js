import { useCallback } from "react";
import { appClient } from "@/api/appClient";

/**
 * Hook for managing character assignment logic
 * Validates permissions and handles assignment/unassignment
 */
export function useCharacterAssignment() {
  /**
   * Check if current user can assign a character
   * DM can assign any character, players can only claim their own
   */
  const canAssignCharacter = useCallback((sheet, currentUser, isDM) => {
    if (isDM) return true;
    // Players can only claim unassigned characters or their own
    return !sheet.assigned_to_email || sheet.assigned_to_email === currentUser?.email;
  }, []);

  /**
   * Check if current user can roll initiative for a character
   * DM can roll for any character, players only for their assigned character
   */
  const canRollInitiativeForCharacter = useCallback((sheet, currentUser, isDM) => {
    if (isDM) return true;
    // Players can only roll for their assigned character
    return sheet.assigned_to_email === currentUser?.email;
  }, []);

  /**
   * Assign a character to a player (DM only can do this)
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
   * Player claims a character (only for unassigned or their own)
   */
  const claimCharacter = useCallback(async (sheetId, playerEmail) => {
    if (!sheetId || !playerEmail) return null;
    try {
      const sheet = await appClient.entities.CharacterSheet.get(sheetId);
      
      // Check if character is available to claim
      if (sheet.assigned_to_email && sheet.assigned_to_email !== playerEmail) {
        throw new Error("This character is already assigned to another player");
      }

      // If already assigned to this player, just return
      if (sheet.assigned_to_email === playerEmail) {
        return sheet;
      }

      // Assign the character
      const updated = await appClient.entities.CharacterSheet.update(sheetId, {
        assigned_to_email: playerEmail,
      });
      return updated;
    } catch (error) {
      console.error("Error claiming character:", error);
      throw error;
    }
  }, []);

  /**
   * Player unclaims their character (removes assignment)
   */
  const unclaimCharacter = useCallback(async (sheetId, playerEmail) => {
    if (!sheetId || !playerEmail) return null;
    try {
      const sheet = await appClient.entities.CharacterSheet.get(sheetId);
      
      // Only allow unclaiming your own character
      if (sheet.assigned_to_email !== playerEmail) {
        throw new Error("You can only unclaim your own character");
      }

      const updated = await appClient.entities.CharacterSheet.update(sheetId, {
        assigned_to_email: "",
      });
      return updated;
    } catch (error) {
      console.error("Error unclaiming character:", error);
      throw error;
    }
  }, []);

  /**
   * Get assignment status message
   */
  const getAssignmentStatus = useCallback((sheet) => {
    if (!sheet.assigned_to_email) {
      return "Unassigned";
    }
    return sheet.assigned_to_email;
  }, []);

  return {
    canAssignCharacter,
    canRollInitiativeForCharacter,
    assignCharacterToPlayer,
    unassignCharacter,
    claimCharacter,
    unclaimCharacter,
    getAssignmentStatus,
  };
}
