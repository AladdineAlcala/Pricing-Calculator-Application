import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { Sidebar } from "@/components/Sidebar";
import Dashboard from "@/pages/Dashboard";
import Ingredients from "@/pages/Ingredients";
import Recipes from "@/pages/Recipes";
import RecipeBuilder from "@/pages/RecipeBuilder";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">
          <Sidebar />
          <main className="flex-1 flex flex-col overflow-hidden">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/ingredients" element={<Ingredients />} />
              <Route path="/recipes" element={<Recipes />} />
              <Route path="/recipes/:id" element={<RecipeBuilder />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
