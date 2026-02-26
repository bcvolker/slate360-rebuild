export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEPLOY_MARKER = "deploy-check-2026-02-26-01";

export default function DeployCheckPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-10 text-gray-900">
      <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 p-6 shadow-sm">
        <h1 className="text-xl font-bold">Deployment Check</h1>
        <p className="mt-3 text-sm text-gray-600">
          This page is forced dynamic with no-store headers. If this marker is visible, your browser is hitting the latest deployment.
        </p>
        <div className="mt-6 rounded-lg bg-gray-50 p-4 text-sm">
          <div>
            <span className="font-semibold">Marker:</span> {DEPLOY_MARKER}
          </div>
          <div className="mt-1">
            <span className="font-semibold">Commit:</span> {process.env.VERCEL_GIT_COMMIT_SHA ?? "(local)"}
          </div>
          <div className="mt-1">
            <span className="font-semibold">Branch:</span> {process.env.VERCEL_GIT_COMMIT_REF ?? "(local)"}
          </div>
          <div className="mt-1">
            <span className="font-semibold">URL:</span> {process.env.VERCEL_URL ?? "(local)"}
          </div>
        </div>
      </div>
    </main>
  );
}
