// Left-side navigation sidebar matching Stitch design specification
import React from "react";
import { NavLink } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { BakeIQBrand } from "@/components/BakeIQLogo";

export function Sidebar() {
  const { state, setTheme } = useApp();
  const isDark = state.settings.theme === "dark";

  return (
    <aside
      className="w-64 bg-artisan-surface dark:bg-[#0c101a] border-r border-artisan-border dark:border-slate-800 flex-shrink-0 flex flex-col justify-between hidden md:flex z-30"
      data-purpose="sidebar-navigation"
    >
      {/* Top Brand Lockup and Primary Navigation */}
      <div className="flex flex-col">
        {/* Logo Header */}
        <div className="h-20 px-5 flex items-center border-b border-artisan-border dark:border-slate-800">
          <BakeIQBrand />
        </div>

        {/* Navigation Menu Groups */}
        <nav className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-180px)]">
          <ul className="space-y-1.5">
            <li>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all group ${
                    isActive
                      ? "bg-culinary-600 text-white shadow-sm"
                      : "text-espresso-700 dark:text-slate-300 hover:bg-artisan-subtle dark:hover:bg-[#141b2c] hover:text-espresso-900 dark:hover:text-white font-medium"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5">
                      <svg
                        className={`w-4 h-4 ${isActive ? "text-white" : "text-espresso-400 dark:text-slate-400"}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                      </svg>
                      <span>Dashboard</span>
                    </div>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </>
                )}
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/ingredients"
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all group ${
                    isActive
                      ? "bg-culinary-600 text-white shadow-sm"
                      : "text-espresso-700 dark:text-slate-300 hover:bg-artisan-subtle dark:hover:bg-[#141b2c] hover:text-espresso-900 dark:hover:text-white font-medium"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5">
                      <svg
                        className={`w-4 h-4 ${isActive ? "text-white" : "text-espresso-400 dark:text-slate-400"}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                      </svg>
                      <span>Ingredients</span>
                    </div>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </>
                )}
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/recipes"
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all group ${
                    isActive
                      ? "bg-culinary-600 text-white shadow-sm"
                      : "text-espresso-700 dark:text-slate-300 hover:bg-artisan-subtle dark:hover:bg-[#141b2c] hover:text-espresso-900 dark:hover:text-white font-medium"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5">
                      <svg
                        className={`w-4 h-4 ${isActive ? "text-white" : "text-espresso-400 dark:text-slate-400"}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                      </svg>
                      <span>Recipes</span>
                    </div>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </>
                )}
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all group ${
                    isActive
                      ? "bg-culinary-600 text-white shadow-sm"
                      : "text-espresso-700 dark:text-slate-300 hover:bg-artisan-subtle dark:hover:bg-[#141b2c] hover:text-espresso-900 dark:hover:text-white font-medium"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5">
                      <svg
                        className={`w-4 h-4 ${isActive ? "text-white" : "text-espresso-400 dark:text-slate-400"}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                        <path
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                      </svg>
                      <span>Settings</span>
                    </div>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </>
                )}
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>

      {/* Bottom Sidebar Footer with Dark Mode Toggle & Engine Status */}
      <div className="p-3 border-t border-artisan-border dark:border-slate-800 space-y-2">
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-espresso-700 dark:text-slate-200 bg-artisan-canvas dark:bg-[#141b2c] hover:bg-artisan-subtle dark:hover:bg-slate-800 rounded-lg border border-artisan-border dark:border-slate-800 transition-colors cursor-pointer"
          type="button"
          id="theme-toggle-btn"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">{isDark ? "☀️" : "🌙"}</span>
            <span>Kitchen Dark Mode</span>
          </div>
          <span className="text-[10px] bg-espresso-200 dark:bg-slate-700 text-espresso-800 dark:text-slate-200 px-1.5 py-0.5 rounded font-mono font-bold">
            {isDark ? "ON" : "OFF"}
          </span>
        </button>

        <div className="px-2 py-1 flex items-center justify-between text-[11px] text-espresso-400 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-culinary-500" />
            v3.2.0 • Real-Time FIFO
          </span>
          <span className="font-mono">PHP (₱)</span>
        </div>
      </div>
    </aside>
  );
}
