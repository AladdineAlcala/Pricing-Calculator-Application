import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { Sidebar } from "@/components/Sidebar";
import { Footer } from "@/components/Footer";
import Dashboard from "@/pages/Dashboard";
import Ingredients from "@/pages/Ingredients";
import Inventory from "@/pages/Inventory";
import Recipes from "@/pages/Recipes";
import RecipeBuilder from "@/pages/RecipeBuilder";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="flex h-screen overflow-hidden bg-artisan-canvas dark:bg-[#080c14] text-espresso-850 dark:text-slate-100 font-sans selection:bg-culinary-100 selection:text-culinary-800">
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/ingredients" element={<Ingredients />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/recipes" element={<Recipes />} />
                <Route path="/recipes/:id" element={<RecipeBuilder />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </div>
            <Footer />
          </main>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
