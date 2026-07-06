import React, { useEffect } from "react";
import DiceRoller from "@/components/DiceRoller";

export default function DicePopout() {
  useEffect(() => {
    document.title = "Dice Roller";
  }, []);

  return (
    <main className="h-screen parchment overflow-hidden">
      <DiceRoller />
    </main>
  );
}
