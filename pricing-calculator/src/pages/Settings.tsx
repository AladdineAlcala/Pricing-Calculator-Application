// Settings page — theme, backup, currency, export
import React, { useState } from "react";
import { backupDatabase, type AppSetting } from "@/lib/api";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardBody,
  AlertBanner,
} from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { Header } from "@/components/Header";
import { Shield, Coins, Palette, HardDrive, Info } from "lucide-react";

export default function Settings() {
  const { state, setTheme, updateSetting } = useApp();
  const s = state.settings;
  const [backupPath, setBackupPath] = useState(s.backup_path);
  const [backingUp, setBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleBackup = async () => {
    setBackingUp(true);
    setBackupResult(null);
    try {
      const dest = await backupDatabase(backupPath);
      updateSetting("backup_path", backupPath);
      setBackupResult({ ok: true, msg: `Backed up to: ${dest}` });
    } catch (err) {
      setBackupResult({ ok: false, msg: String(err) });
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-artisan-canvas dark:bg-[#080c14] text-espresso-850 dark:text-slate-100 transition-colors">
      <Header />
      <div className="flex-1 p-6 md:p-8 space-y-6 max-w-4xl">
        <div className="mb-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-espresso-900 dark:text-white">
            Settings &amp; Configuration
          </h1>
          <p className="text-sm text-espresso-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Configure application display preferences, active currency symbols, and database backup routines.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {/* Appearance */}
          <Card>
            <CardHeader className="flex items-center gap-2.5">
              <Palette className="w-4 h-4 text-culinary-600 dark:text-emerald-400" />
              <h2 className="text-sm font-bold text-espresso-900 dark:text-white">Appearance &amp; Theme</h2>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-espresso-850 dark:text-slate-200">Interface Theme</p>
                  <p className="text-xs text-espresso-400 dark:text-slate-400 mt-0.5">
                    Select between Luminous Light and Nocturne Dark themes
                  </p>
                </div>
                <div className="flex rounded-xl border border-artisan-border dark:border-slate-800 overflow-hidden bg-artisan-canvas dark:bg-[#141b2c] p-1 shrink-0">
                  <button
                    onClick={() => setTheme("light")}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      s.theme === "light"
                        ? "bg-white dark:bg-slate-800 text-espresso-900 dark:text-white shadow-artisan-subtle"
                        : "text-espresso-500 dark:text-slate-400 hover:text-espresso-800 dark:hover:text-slate-200"
                    }`}
                    id="theme-light-btn"
                  >
                    ☀️ Light
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      s.theme === "dark"
                        ? "bg-slate-800 text-white shadow-artisan-subtle"
                        : "text-espresso-500 dark:text-slate-400 hover:text-espresso-800 dark:hover:text-slate-200"
                    }`}
                    id="theme-dark-btn"
                  >
                    🌙 Dark
                  </button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Currency */}
          <Card>
            <CardHeader className="flex items-center gap-2.5">
              <Coins className="w-4 h-4 text-culinary-600 dark:text-emerald-400" />
              <h2 className="text-sm font-bold text-espresso-900 dark:text-white">
                Currency Display
              </h2>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <Input
                    label="Currency Symbol"
                    value={s.currency_symbol}
                    onChange={(e) => updateSetting("currency_symbol", e.target.value)}
                    placeholder="₱"
                    id="currency-symbol"
                  />
                </div>
                <div className="sm:mt-5 rounded-xl border border-artisan-border dark:border-slate-800 bg-artisan-subtle dark:bg-[#141b2c] px-5 py-2.5 shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-espresso-400 dark:text-slate-400">Preview</p>
                  <p className="text-xl font-black font-mono text-culinary-600 dark:text-emerald-400 mt-0.5">
                    {s.currency_symbol}1,234.56
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Backup */}
          <Card>
            <CardHeader className="flex items-center gap-2.5">
              <HardDrive className="w-4 h-4 text-culinary-600 dark:text-emerald-400" />
              <h2 className="text-sm font-bold text-espresso-900 dark:text-white">
                Data Backup &amp; Storage
              </h2>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col gap-4">
                {backupResult && (
                  <AlertBanner
                    type={backupResult.ok ? "success" : "error"}
                    title={backupResult.ok ? "Backup successful" : "Backup failed"}
                    message={backupResult.msg}
                  />
                )}

                <Input
                  label="Backup Directory Path"
                  value={backupPath}
                  onChange={(e) => setBackupPath(e.target.value)}
                  placeholder="Leave empty for default (%APPDATA%/pricing-calculator/Backups)"
                  id="backup-path"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div>
                    <p className="text-xs text-espresso-500 dark:text-slate-400">
                      Last backup:{" "}
                      <span className="font-semibold text-espresso-900 dark:text-slate-200">
                        {s.last_backup
                          ? new Date(s.last_backup).toLocaleString()
                          : "Never"}
                      </span>
                    </p>
                    <p className="text-[11px] text-espresso-400 dark:text-slate-500 mt-0.5">
                      Creates a timestamped snapshot of your SQLite database
                    </p>
                  </div>
                  <Button
                    onClick={handleBackup}
                    isLoading={backingUp}
                    variant="secondary"
                    id="run-backup-btn"
                  >
                    💾 Run Backup Now
                  </Button>
                </div>

                <div className="rounded-xl bg-culinary-50 dark:bg-emerald-950/40 border border-culinary-200/80 dark:border-emerald-800/60 px-4 py-3 text-xs text-culinary-900 dark:text-emerald-300">
                  <p className="font-bold mb-1">💡 Backup tip</p>
                  <p className="leading-relaxed">
                    Copy the backup file to Google Drive, OneDrive, or an external drive to protect
                    against local hardware failure. The system automatically creates a safety snapshot on startup.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* About */}
          <Card>
            <CardHeader className="flex items-center gap-2.5">
              <Info className="w-4 h-4 text-culinary-600 dark:text-emerald-400" />
              <h2 className="text-sm font-bold text-espresso-900 dark:text-white">About BakeIQ Engine</h2>
            </CardHeader>
            <CardBody>
              <div className="text-xs flex flex-col gap-2 text-espresso-600 dark:text-slate-400">
                <div className="flex justify-between py-1.5 border-b border-artisan-border/60 dark:border-slate-800/60">
                  <span>Application</span>
                  <span className="font-bold text-espresso-900 dark:text-white">
                    BakeIQ Pricing Calculator
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-artisan-border/60 dark:border-slate-800/60">
                  <span>Version</span>
                  <span className="font-mono font-semibold text-espresso-900 dark:text-white">v0.1.0</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-artisan-border/60 dark:border-slate-800/60">
                  <span>Tech Stack</span>
                  <span className="font-medium text-espresso-900 dark:text-white">
                    Tauri v2 + React 19 + TypeScript + SQLite
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-artisan-border/60 dark:border-slate-800/60">
                  <span>Architecture</span>
                  <span className="font-medium text-espresso-900 dark:text-white">Local-First Desktop Engine</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>Active Currency</span>
                  <span className="font-bold text-culinary-600 dark:text-emerald-400">
                    Philippine Peso ({s.currency_symbol || "₱"})
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
