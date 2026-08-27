import { useCallback, useEffect, useMemo, useState } from "react";
import { api, fileUrl } from "./api";
import { EnvironmentScreen } from "./screens/EnvironmentScreen";
import { LogScreen } from "./screens/LogScreen";
import { ProcessScreen } from "./screens/ProcessScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import { ViewScreen } from "./screens/ViewScreen";
import type { CaptureType, EnvStatus, JobEvent, Quality, Tab } from "./types";

export function App() {
  const [tab, setTab] = useState<Tab>("process");
  const [projectName, setProjectName] = useState("House Walk — Aug 21");
  const [captureType, setCaptureType] = useState<CaptureType>("unknown");
  const [quality, setQuality] = useState<Quality>("preview");
  const [inputPath, setInputPath] = useState("");
  const [fileLabel, setFileLabel] = useState("");
  const [env, setEnv] = useState<EnvStatus | null>(null);
  const [running, setRunning] = useState(false);
  const [runRoot, setRunRoot] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [last, setLast] = useState<JobEvent | null>(null);

  const refreshEnv = useCallback(() => {
    api.env().then(setEnv).catch(() => setEnv(null));
  }, []);

  useEffect(() => {
    refreshEnv();
  }, [refreshEnv]);

  useEffect(() => {
    const id = setInterval(() => {
      api
        .status()
        .then((s) => {
          setRunning(Boolean(s.running));
          setRunRoot((s.runRoot as string) || null);
          setLogs((s.logs as string[]) || []);
          const events = (s.events as JobEvent[]) || [];
          if (events.length) setLast(events[events.length - 1]);
        })
        .catch(() => {});
    }, 800);
    return () => clearInterval(id);
  }, []);

  const splatUrl = useMemo(() => {
    if (last?.spz) return fileUrl(last.spz);
    return "https://sparkjs.dev/assets/splats/butterfly.spz";
  }, [last]);

  const tabs: Tab[] = ["process", "view", "results", "log", "environment"];

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="brand">SLATE360 RESEARCH PROCESSOR</div>
          <div className="badge">PHD RESEARCH · ODGS-SLAM NOT FOR COMMERCIAL JOBS</div>
        </div>
        <div className="muted">{env?.gpu.detail}</div>
      </header>
      <nav className="tabs">
        {tabs.map((id) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            {id}
          </button>
        ))}
      </nav>
      {tab === "process" && (
        <ProcessScreen
          projectName={projectName}
          setProjectName={setProjectName}
          captureType={captureType}
          setCaptureType={setCaptureType}
          quality={quality}
          setQuality={setQuality}
          fileLabel={fileLabel}
          inputPath={inputPath}
          setInputPath={setInputPath}
          onFile={(path, name) => {
            setInputPath(path);
            setFileLabel(name);
          }}
          env={env}
          running={running}
          last={last}
          onProcess={() => {
            api
              .start({ projectName, inputPath, captureType, quality })
              .then(() => setTab("log"))
              .catch((err: Error) => alert(err.message));
          }}
          onCancel={() => api.cancel()}
        />
      )}
      {tab === "view" && <ViewScreen splatUrl={splatUrl} />}
      {tab === "results" && <ResultsScreen last={last} runRoot={runRoot} />}
      {tab === "log" && <LogScreen lines={logs} />}
      {tab === "environment" && <EnvironmentScreen env={env} onRefresh={refreshEnv} />}
    </div>
  );
}
