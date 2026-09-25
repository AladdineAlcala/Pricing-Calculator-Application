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
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Settings</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Configure application preferences and backup options
        </p>
      </div>

      <div className="flex flex-col gap-6 max-w-xl">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">Appearance</h2>
          </CardHeader>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">Theme</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  Choose between light and dark mode
                </p>
              </div>
              <div className="flex rounded-lg border border-[hsl(var(--border))] overflow-hidden">
                <button
                  onClick={() => setTheme("light")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    s.theme === "light"
                      ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                      : "hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))]"
                  }`}
                  id="theme-light-btn"
                >
                  ☀️ Light
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-l border-[hsl(var(--border))] ${
                    s.theme === "dark"
                      ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                      : "hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))]"
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
          <CardHeader>
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              Currency Display
            </h2>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  label="Currency Symbol"
                  value={s.currency_symbol}
                  onChange={(e) => updateSetting("currency_symbol", e.target.value)}
                  placeholder="₱"
                  id="currency-symbol"
                />
              </div>
              <div className="mt-6 rounded-lg border border-[hsl(var(--border))] px-4 py-2.5">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Preview</p>
                <p className="text-lg font-bold text-[hsl(var(--foreground))]">
                  {s.currency_symbol}1,234.56
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Backup */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              Data Backup
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

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Last backup:{" "}
                    <span className="font-medium text-[hsl(var(--foreground))]">
                      {s.last_backup
                        ? new Date(s.last_backup).toLocaleString()
                        : "Never"}
                    </span>
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    Creates a timestamped copy of your SQLite database file
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

              <div className="rounded-lg bg-[hsl(var(--accent))] px-4 py-3 text-xs
                text-[hsl(var(--accent-foreground))]">
                <p className="font-semibold mb-1">💡 Backup tip</p>
                <p>
                  Copy the backup file to Google Drive, OneDrive, or a USB drive to protect
                  against hardware failure. The app also auto-backs up daily on startup.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">About</h2>
          </CardHeader>
          <CardBody>
            <div className="text-sm flex flex-col gap-1.5 text-[hsl(var(--muted-foreground))]">
              <div className="flex justify-between">
                <span>Application</span>
                <span className="font-medium text-[hsl(var(--foreground))]">
                  Pricing Calculator
                </span>
              </div>
              <div className="flex justify-between">
                <span>Version</span>
                <span className="font-medium text-[hsl(var(--foreground))]">0.1.0</span>
              </div>
              <div className="flex justify-between">
                <span>Stack</span>
                <span className="font-medium text-[hsl(var(--foreground))]">
                  Tauri v2 + React + SQLite
                </span>
              </div>
              <div className="flex justify-between">
                <span>Architecture</span>
                <span className="font-medium text-[hsl(var(--foreground))]">Local-first</span>
              </div>
              <div className="flex justify-between">
                <span>Currency</span>
                <span className="font-medium text-[hsl(var(--foreground))]">
                  Philippine Peso (₱)
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
