import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { s3, BUCKET } from "@/lib/s3";

type Params = { projectId: string };

async function authorize(projectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { project } = await getScopedProjectForUser(user.id, projectId, "id,name");
  if (!project) return { user: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  return { user, error: null };
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function decodeText(buffer: Uint8Array): string {
  return normalizeWhitespace(Buffer.from(buffer).toString("utf-8"));
}

function decodePdfFallback(buffer: Uint8Array): string {
  const raw = Buffer.from(buffer).toString("latin1");
  const cleaned = raw
    .replace(/\r|\n/g, " ")
    .replace(/\([^)]{2,500}\)/g, " $& ")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ");
  return normalizeWhitespace(cleaned);
}

async function decodeDocx(buffer: Uint8Array): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file("word/document.xml")?.async("string");
    if (!docXml) return "";
    const text = docXml
      .replace(/<w:tab\/?\s*>/g, "\t")
      .replace(/<w:br\/?\s*>/g, "\n")
      .replace(/<[^>]+>/g, " ");
    return normalizeWhitespace(text);
  } catch {
    return "";
  }
}

async function bodyToUint8Array(body: unknown): Promise<Uint8Array> {
  const streamBody = body as { transformToByteArray?: () => Promise<Uint8Array> } | null;
  if (streamBody?.transformToByteArray) {
    return streamBody.transformToByteArray();
  }
  return new Uint8Array();
}

function deriveRequirements(text: string): string[] {
  const lower = text.toLowerCase();
  const findings: string[] = [];

  const checks: Array<{ re: RegExp; label: string }> = [
    { re: /insurance|certificate of insurance|general liability/, label: "Insurance obligations are specified and should be tracked for compliance." },
    { re: /retainage|retention/, label: "Retainage terms are present and should be reflected in payment tracking." },
    { re: /change order|change directive/, label: "Change order procedure is defined and requires documented approval workflow." },
    { re: /notice|written notice|days'? notice/, label: "Formal notice requirements are present and should be calendared." },
    { re: /submittal|shop drawing/, label: "Submittal review obligations are defined and should tie to submittal logs." },
    { re: /indemnif|hold harmless/, label: "Indemnity obligations are present and need risk/legal review." },
    { re: /warranty|guarantee/, label: "Warranty obligations are present and should be captured for closeout." },
    { re: /termination|suspend/, label: "Termination/suspension provisions are present and should be escalated to project leadership." },
    { re: /dispute|arbitration|mediation|litigation/, label: "Dispute-resolution terms are present and should be documented for legal process." },
    { re: /payment|invoice|application for payment/, label: "Payment application requirements are present and should align with billing workflows." },
    { re: /liquidated damages|delay damages/, label: "Delay/liquidated damages language is present and should be monitored against schedule risk." },
  ];

  for (const check of checks) {
    if (check.re.test(lower)) findings.push(check.label);
    if (findings.length >= 8) break;
  }

  return findings;
}

async function summarizeWithOpenAI(text: string, fallbackSummary: string, fallbackReqs: string[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !text || text.length < 150) {
    return { summary: fallbackSummary, requirements: fallbackReqs, source: "rule-based" as const };
  }

  const clipped = text.slice(0, 12000);
  const prompt = [
    "You are a construction contracts analyst.",
    "Return strict JSON only with this shape:",
    '{"summary":"...", "requirements":["...", "..."]}',
    "summary: 2-4 sentences in plain English for project managers.",
    "requirements: 4-8 concrete contractual requirements or obligations.",
    "Avoid legal advice disclaimers.",
    "Contract text:",
    clipped,
  ].join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You extract clear PM-ready summaries and obligations from construction contracts." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      return { summary: fallbackSummary, requirements: fallbackReqs, source: "rule-based" as const };
    }

    const payload = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return { summary: fallbackSummary, requirements: fallbackReqs, source: "rule-based" as const };
    }

    const parsed = JSON.parse(content) as { summary?: string; requirements?: string[] };
    const summary = normalizeWhitespace(parsed.summary ?? "") || fallbackSummary;
    const requirements = Array.isArray(parsed.requirements)
      ? parsed.requirements.map((item) => normalizeWhitespace(String(item))).filter(Boolean).slice(0, 8)
      : fallbackReqs;

    return {
      summary,
      requirements: requirements.length ? requirements : fallbackReqs,
      source: "openai" as const,
    };
  } catch {
    return { summary: fallbackSummary, requirements: fallbackReqs, source: "rule-based" as const };
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<Params> }) {
  const { projectId } = await params;
  const { error } = await authorize(projectId);
  if (error) return error;

  const body = await req.json() as { contractId?: string };
  const contractId = body.contractId?.trim();
  if (!contractId) {
    return NextResponse.json({ error: "contractId is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: contract, error: contractErr } = await admin
    .from("project_contracts")
    .select("id,title,contract_type,parties,executed_date,contract_value,status,notes,file_upload_id")
    .eq("id", contractId)
    .eq("project_id", projectId)
    .single();

  if (contractErr || !contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  let extractedText = "";
  if (contract.file_upload_id) {
    const { data: upload } = await admin
      .from("slatedrop_uploads")
      .select("id,file_name,file_type,s3_key,status")
      .eq("id", contract.file_upload_id)
      .neq("status", "deleted")
      .single();

    if (upload?.s3_key) {
      const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: upload.s3_key }));
      const bytes = await bodyToUint8Array(obj.Body);
      const fileType = (upload.file_type ?? "").toLowerCase();
      const fileName = (upload.file_name ?? "").toLowerCase();

      if (fileType === "txt" || fileName.endsWith(".txt")) {
        extractedText = decodeText(bytes);
      } else if (fileType === "docx" || fileName.endsWith(".docx")) {
        extractedText = await decodeDocx(bytes);
      } else if (fileType === "pdf" || fileName.endsWith(".pdf")) {
        extractedText = decodePdfFallback(bytes);
      } else {
        extractedText = decodeText(bytes);
      }
    }
  }

  const summaryBase = normalizeWhitespace([
    `${contract.contract_type ?? "Contract"} for ${contract.title}.`,
    contract.contract_value
      ? `Current contract value is $${Number(contract.contract_value).toLocaleString()}.`
      : "Contract value is not set.",
    contract.parties ? `Parties: ${contract.parties}.` : "Parties are not fully specified.",
    contract.executed_date
      ? `Executed on ${new Date(contract.executed_date).toLocaleDateString()}.`
      : "Execution date is not recorded.",
    extractedText ? "Analysis includes extracted file content." : "Analysis is based on stored contract metadata.",
  ].join(" "));

  const baseRequirements = deriveRequirements(extractedText);
  if (!baseRequirements.length) {
    baseRequirements.push(
      "Validate payment milestones and submission requirements before invoicing.",
      "Confirm change-order approval authority and documentation workflow.",
      "Track insurance/warranty obligations in project closeout checklist.",
      "Verify notice and response timelines are configured in project reminders."
    );
  }

  const ai = await summarizeWithOpenAI(extractedText, summaryBase, baseRequirements);

  const { error: updateErr } = await admin
    .from("project_contracts")
    .update({
      summary: ai.summary,
      key_requirements: JSON.stringify(ai.requirements),
      updated_at: new Date().toISOString(),
    })
    .eq("id", contractId)
    .eq("project_id", projectId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    summary: ai.summary,
    requirements: ai.requirements,
    source: ai.source,
  });
}
