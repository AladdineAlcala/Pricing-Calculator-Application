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
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#F9F8F6] text-[#0F0F0F]">
      <Header />
      <div className="flex-1 p-6 md:p-8 space-y-6 max-w-4xl">
        <div className="mb-2">
          <h1 className="text-4xl md:text-5xl font-black text-[#0F0F0F] tracking-tight">
            Settings &amp; Configuration
          </h1>
          <p className="text-sm text-[#6B6B6B] mt-1 max-w-2xl leading-relaxed">
            Configure application display preferences, active currency symbols, and database backup routines.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {/* Appearance */}
          <Card>
            <CardHeader className="flex items-center gap-2.5 pb-4 border-b border-[#E5E3DF]">
              <Palette className="w-5 h-5 text-[#D97A34]" />
              <h2 className="text-base font-bold text-[#0F0F0F]">Appearance &amp; Theme</h2>
            </CardHeader>
            <CardBody className="pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#0F0F0F]">Interface Theme</p>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">
                    Select between Artisan Canvas (Light) and Roasted Espresso (Dark) themes
                  </p>
                </div>
                <div className="flex rounded-lg border border-[#E5E3DF] overflow-hidden bg-[#F9F8F6] p-1 shrink-0">
                  <button
                    onClick={() => setTheme("light")}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      s.theme === "light"
                        ? "bg-[#0F0F0F] text-white shadow-xs"
                        : "text-[#6B6B6B] hover:text-[#0F0F0F]"
                    }`}
                    id="theme-light-btn"
                  >
                    ☀️ Light
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      s.theme === "dark"
                        ? "bg-[#0F0F0F] text-white shadow-xs"
                        : "text-[#6B6B6B] hover:text-[#0F0F0F]"
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
            <CardHeader className="flex items-center gap-2.5 pb-4 border-b border-[#E5E3DF]">
              <Coins className="w-5 h-5 text-[#D97A34]" />
              <h2 className="text-base font-bold text-[#0F0F0F]">
                Currency Display
              </h2>
            </CardHeader>
            <CardBody className="pt-4">
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
                <div className="sm:mt-5 rounded-xl border border-[#E5E3DF] bg-[#F9F8F6] px-5 py-2.5 shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">Preview</p>
                  <p className="text-xl font-bold font-mono text-[#4A7C59] mt-0.5">
                    {s.currency_symbol}1,234.56
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Backup */}
          <Card>
            <CardHeader className="flex items-center gap-2.5 pb-4 border-b border-[#E5E3DF]">
              <HardDrive className="w-5 h-5 text-[#D97A34]" />
              <h2 className="text-base font-bold text-[#0F0F0F]">
                Data Backup &amp; Storage
              </h2>
            </CardHeader>
            <CardBody className="pt-4">
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
                    <p className="text-xs text-[#6B6B6B]">
                      Last backup:{" "}
                      <span className="font-semibold text-[#0F0F0F]">
                        {s.last_backup
                          ? new Date(s.last_backup).toLocaleString()
                          : "Never"}
                      </span>
                    </p>
                    <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                      Creates a timestamped snapshot of your SQLite database
                    </p>
                  </div>
                  <Button
                    onClick={handleBackup}
                    isLoading={backingUp}
                    className="bg-[#D97A34] hover:bg-[#c26827] text-white font-bold rounded-lg shadow-sm"
                    id="run-backup-btn"
                  >
                    💾 Run Backup Now
                  </Button>
                </div>

                <div className="rounded-xl bg-[#4A7C59]/10 border border-[#4A7C59]/20 px-4 py-3 text-xs text-[#0F0F0F]">
                  <p className="font-bold text-[#4A7C59] mb-1">💡 Backup tip</p>
                  <p className="leading-relaxed text-[#0F0F0F]">
                    Copy the backup file to Google Drive, OneDrive, or an external drive to protect
                    against local hardware failure. The system automatically creates a safety snapshot on startup.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* About */}
          <Card>
            <CardHeader className="flex items-center gap-2.5 pb-4 border-b border-[#E5E3DF]">
              <Info className="w-5 h-5 text-[#D97A34]" />
              <h2 className="text-base font-bold text-[#0F0F0F]">About BakeIQ Engine</h2>
            </CardHeader>
            <CardBody className="pt-4">
              <div className="text-xs flex flex-col gap-2 text-[#0F0F0F]">
                <div className="flex justify-between py-2 border-b border-[#E5E3DF]">
                  <span className="text-[#6B6B6B]">Application</span>
                  <span className="font-bold text-[#0F0F0F]">
                    BakeIQ Pricing Calculator
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#E5E3DF]">
                  <span className="text-[#6B6B6B]">Version</span>
                  <span className="font-mono font-bold text-[#0F0F0F]">v0.1.0</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#E5E3DF]">
                  <span className="text-[#6B6B6B]">Tech Stack</span>
                  <span className="font-medium text-[#0F0F0F]">
                    Tauri v2 + React 19 + TypeScript + SQLite
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#E5E3DF]">
                  <span className="text-[#6B6B6B]">Architecture</span>
                  <span className="font-medium text-[#0F0F0F]">Local-First Desktop Engine</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[#6B6B6B]">Active Currency</span>
                  <span className="font-bold font-mono text-[#4A7C59]">
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
