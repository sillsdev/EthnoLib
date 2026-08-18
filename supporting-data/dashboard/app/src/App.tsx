import { useEffect, useState } from "react";

import { DashboardTab } from "./tabs/DashboardTab";
import { DataTab } from "./tabs/DataTab";
import { RunsTab } from "./tabs/RunsTab";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "data", label: "Data" },
  { id: "runs", label: "Collection runs" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

const isTabId = (value: string): value is TabId =>
  TABS.some((tab) => tab.id === value);

/** The tab named by the URL hash, so a link to one tab opens on that tab. */
function tabFromHash(): TabId {
  const name = window.location.hash.replace(/^#/, "");
  return isTabId(name) ? name : "dashboard";
}

export function App() {
  const [tab, setTab] = useState<TabId>(tabFromHash);

  // Back/forward and hand-edited hashes move the tab too.
  useEffect(() => {
    const onHashChange = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const show = (next: TabId) => {
    // Writing the hash fires hashchange, which sets the state; setting it here as
    // well keeps the click responsive when the hash is already what we want.
    window.location.hash = next;
    setTab(next);
  };

  return (
    <main>
      <h1>EthnoLib supporting data</h1>

      <nav className="tabs" aria-label="Sections">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="tab"
            aria-current={tab === entry.id ? "page" : undefined}
            onClick={() => show(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </nav>

      {tab === "dashboard" && <DashboardTab />}
      {tab === "data" && <DataTab />}
      {tab === "runs" && <RunsTab />}
    </main>
  );
}
