import { ShieldCheck, X } from "lucide-react";
import { AdminCommercePanel } from "@/components/AdminCommercePanel";
import { AdminBackupPanel } from "@/components/AdminBackupPanel";
import { AdminLibraryPanel } from "@/components/AdminLibraryPanel";
import { AdminPanel } from "@/components/AdminPanel";
import { CourseCatalogManagementPanel } from "@/components/CourseCatalogManagementPanel";
import { GlobalContactSettingsPanel } from "@/components/GlobalContactSettingsPanel";
import { GlobalSettingsPanel } from "@/components/GlobalSettingsPanel";
import { LearningIntelligenceAdminPanel } from "@/components/LearningIntelligenceAdminPanel";
import { StorefrontLivePreview } from "@/components/StorefrontLivePreview";
import { CompetitionAdminPanel } from "@/components/CompetitionAdminPanel";
import { AlertAdminPanel } from "@/components/AlertAdminPanel";
import { AdminSecurityPanel } from "@/components/AdminSecurityPanel";
import { rootManagementSections, type RootManagementSection } from "@/lib/rootManagementNavigation";

export type { RootManagementSection } from "@/lib/rootManagementNavigation";

type RootManagementPanelProps = {
  activeSection: RootManagementSection;
  onSectionChange: (section: RootManagementSection) => void;
  onClose: () => void;
};

export function RootManagementPanel({ activeSection, onSectionChange, onClose }: RootManagementPanelProps) {
  const active = rootManagementSections.find((section) => section.id === activeSection) ?? rootManagementSections[0];

  return (
    <div className="fixed inset-0 z-[80] bg-[#081e27]/72 p-0 backdrop-blur-md sm:p-3">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="root-management-title"
        className="mx-auto flex h-full w-full max-w-[1580px] flex-col overflow-hidden bg-[#f7faf8] shadow-[0_30px_100px_-32px_rgba(0,0,0,.6)] sm:h-[calc(100vh-1.5rem)] sm:rounded-[1.6rem] sm:border sm:border-[#31545d] lg:flex-row"
      >
        <aside className="shrink-0 border-b border-white/10 bg-[linear-gradient(180deg,#173c48,#102f3a)] text-white lg:flex lg:w-60 lg:flex-col lg:border-b-0 lg:border-r">
          <div className="shrink-0 flex items-start justify-between gap-3 border-b border-white/10 px-4 py-4 lg:p-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[#9be0d2]"><ShieldCheck className="h-4 w-4" /><p className="text-[10px] font-bold tracking-[0.2em]">ROOT / GESTÃO</p></div>
              <h2 id="root-management-title" className="font-display mt-2 text-lg font-bold">Centro de comando</h2>
              <p className="mt-1 text-xs leading-5 text-[#c7dedd]">Administre a operação em áreas independentes.</p>
            </div>
            <button onClick={onClose} aria-label="Fechar gestão ROOT" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/25 text-white transition hover:bg-white/10 lg:hidden"><X className="h-4 w-4" /></button>
          </div>
          <nav aria-label="Áreas da gestão ROOT" className="flex min-h-0 gap-1 overflow-x-auto px-3 py-3 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:px-3 lg:py-5">
            {rootManagementSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onSectionChange(section.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`min-w-[8.25rem] rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9be0d2] lg:min-w-0 ${isActive ? "border-white/15 bg-white/12 text-white shadow-[inset_3px_0_0_#8ad2c3]" : "border-transparent text-[#cadbdc] hover:border-white/15 hover:bg-white/10 hover:text-white"}`}
                >
                  <span className="flex items-center gap-2 text-sm font-bold"><Icon className="h-4 w-4 shrink-0" />{section.label}</span>
                  <span className={`mt-1 block text-[10px] leading-4 ${isActive ? "text-[#d8f4ef]" : "text-[#94b0b5]"}`}>{section.description}</span>
                </button>
              );
            })}
          </nav>
          <div className="hidden shrink-0 border-t border-white/10 p-5 lg:block"><p className="text-[10px] font-bold tracking-[0.18em] text-[#9be0d2]">ÁREA ATIVA</p><p className="mt-2 text-sm font-bold">{active.label}</p><p className="mt-1 text-xs leading-5 text-[#b8d0d1]">{active.description}</p></div>
          <button onClick={onClose} className="hidden shrink-0 m-4 mt-0 items-center justify-center rounded-xl border border-white/25 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10 lg:flex">Fechar gestão</button>
        </aside>
        <div className="relative min-h-0 flex-1 bg-[#f4f7f5]">
          <div className="root-management-embedded h-full">
            {activeSection === "business" && <AdminCommercePanel embedded />}
            {activeSection === "students" && <AdminPanel embedded mode="students" />}
            {activeSection === "security" && <AdminSecurityPanel />}
            {activeSection === "courses" && <CourseCatalogManagementPanel />}
            {activeSection === "contents" && <AdminLibraryPanel embedded />}
            {activeSection === "learning" && <LearningIntelligenceAdminPanel />}
            {activeSection === "alerts" && <AlertAdminPanel />}
            {activeSection === "contacts" && <GlobalContactSettingsPanel />}
            {activeSection === "settings" && <div className="grid h-full min-h-0 xl:grid-cols-[minmax(0,1fr)_minmax(440px,.9fr)]"><div className="min-h-0"><GlobalSettingsPanel /></div><StorefrontLivePreview /></div>}
            {activeSection === "competition" && <CompetitionAdminPanel />}
            {activeSection === "backup" && <AdminBackupPanel />}
          </div>
        </div>
      </section>
    </div>
  );
}
