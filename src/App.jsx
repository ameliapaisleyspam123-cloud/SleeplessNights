import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import CampaignLobby from "@/pages/CampaignLobby";
import Home from "@/pages/Home";
import Characters from "@/pages/Characters";
import Chat from "@/pages/Chat";
import Lore from "@/pages/Lore";
import Notes from "@/pages/Notes";
import Broadcast from "@/pages/Broadcast";
import DmVault from "@/pages/DmVault";
import Documents from "@/pages/Documents";
import PageNotFound from "@/lib/PageNotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/campaign" element={<CampaignLobby />} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="characters" element={<Characters />} />
        <Route path="chat" element={<Chat />} />
        <Route path="lore" element={<Lore />} />
        <Route path="notes" element={<Notes />} />
        <Route path="broadcast" element={<Broadcast />} />
        <Route path="vault" element={<DmVault />} />
        <Route path="documents" element={<Documents />} />
      </Route>
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}
