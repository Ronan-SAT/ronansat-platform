import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { getGoogleDriveClient } from "@/lib/googleDrive/client";
import { getGoogleDrivePdfRootFolderId } from "@/lib/googleDrive/env";
import { MATH_SECTION, VERBAL_SECTION } from "@/lib/sections";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PdfMode = "full" | "sectional";
type SectionName = typeof VERBAL_SECTION | typeof MATH_SECTION;

type AssetKind = "full" | "verbal" | "math";

type AssetTarget = {
  inputPath: string;
  testId: string;
  mode: PdfMode;
  sectionName: SectionName | null;
  moduleNumber: number | null;
  kind: AssetKind;
};

type ActiveAssetRow = {
  test_id: string;
  mode: PdfMode;
  section_name: string | null;
  module_number: number | null;
  asset_kind: string;
  id: string;
  version: number;
};

type TestTitleRow = {
  id: string;
  title: string;
};

const STRICT_FILE_PATTERN = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(full|verbal|math)\.pdf$/i;
const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

function parseArgs() {
  const args = process.argv.slice(2);
  let execute = false;
  let inputDir = "";

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === "--execute") {
      execute = true;
    } else if (arg === "--input-dir" && next) {
      inputDir = path.resolve(next);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!inputDir) {
    throw new Error("Missing --input-dir");
  }

  return { execute, inputDir };
}

async function sha256File(filePath: string) {
  const hash = createHash("sha256");
  hash.update(await readFile(filePath));
  return hash.digest("hex");
}

function buildTarget(inputPath: string, testId: string, kind: AssetKind): AssetTarget {
  return {
    inputPath,
    testId,
    kind,
    mode: kind === "full" ? "full" : "sectional",
    sectionName: kind === "verbal" ? VERBAL_SECTION : kind === "math" ? MATH_SECTION : null,
    moduleNumber: null,
  };
}

function strictTarget(filePath: string): AssetTarget | null {
  const match = path.basename(filePath).match(STRICT_FILE_PATTERN);
  if (!match) {
    return null;
  }

  return buildTarget(filePath, match[1], match[2].toLowerCase() as AssetKind);
}

function getLogicalObjectKey(target: AssetTarget, version: number) {
  if (target.mode === "full") {
    return `test-pdfs/${target.testId}/full/v${version}.pdf`;
  }

  return `test-pdfs/${target.testId}/sectional/${target.kind}/v${version}.pdf`;
}

function sanitizeDownloadFileName(fileName: string) {
  const cleaned = fileName
    .replace(/[\r\n"]/g, "")
    .replace(/[<>:"/\\|?*]/g, "")
    .trim();
  return cleaned || "ronan-sat-practice.pdf";
}

function getDownloadFileName(target: AssetTarget, title?: string) {
  const baseTitle = title?.trim() || target.testId;
  if (target.mode === "sectional" && target.sectionName) {
    return sanitizeDownloadFileName(`Ronan SAT - ${baseTitle} - ${target.sectionName}.pdf`);
  }

  return sanitizeDownloadFileName(`Ronan SAT - ${baseTitle}.pdf`);
}

function getAssetVersionKey(target: {
  testId: string;
  mode: PdfMode;
  sectionName: string | null;
  moduleNumber: number | null;
}) {
  return [
    target.testId,
    target.mode,
    target.sectionName ?? "",
    target.moduleNumber ?? -1,
    "flattened_pdf",
  ].join("|");
}

async function loadNextVersionMap() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("test_pdf_assets")
    .select("id, test_id, mode, section_name, module_number, asset_kind, version")
    .eq("asset_kind", "flattened_pdf");

  if (error) {
    throw new Error(error.message);
  }

  const map = new Map<string, number>();
  for (const row of (data ?? []) as ActiveAssetRow[]) {
    const key = getAssetVersionKey({
      testId: row.test_id,
      mode: row.mode,
      sectionName: row.section_name,
      moduleNumber: row.module_number,
    });
    map.set(key, Math.max(map.get(key) ?? 1, row.version + 1));
  }

  return map;
}

async function loadTestTitleMap(testIds: string[]) {
  if (testIds.length === 0) {
    return new Map<string, string>();
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("tests").select("id, title").in("id", testIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(((data ?? []) as TestTitleRow[]).map((row) => [row.id, row.title]));
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function getOrCreateDriveFolder(drive: ReturnType<typeof getGoogleDriveClient>, name: string, parentId: string, execute: boolean) {
  if (!execute) {
    return `dry-run:${parentId}/${name}`;
  }

  const query = [
    `name = '${escapeDriveQueryValue(name)}'`,
    `mimeType = '${DRIVE_FOLDER_MIME_TYPE}'`,
    `'${escapeDriveQueryValue(parentId)}' in parents`,
    "trashed = false",
  ].join(" and ");
  const existing = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const existingId = existing.data.files?.[0]?.id;
  if (existingId) {
    return existingId;
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: DRIVE_FOLDER_MIME_TYPE,
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  if (!created.data.id) {
    throw new Error(`Failed to create Google Drive folder: ${name}`);
  }

  return created.data.id;
}

async function ensureDriveFolderPath(drive: ReturnType<typeof getGoogleDriveClient>, rootFolderId: string, folderParts: string[], execute: boolean) {
  let parentId = rootFolderId;
  for (const part of folderParts) {
    parentId = await getOrCreateDriveFolder(drive, part, parentId, execute);
  }
  return parentId;
}

async function uploadDriveFile(drive: ReturnType<typeof getGoogleDriveClient>, filePath: string, fileName: string, folderId: string) {
  const uploaded = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: "application/pdf",
      parents: [folderId],
    },
    media: {
      mimeType: "application/pdf",
      body: createReadStream(filePath),
    },
    fields: "id",
    supportsAllDrives: true,
  });

  if (!uploaded.data.id) {
    throw new Error(`Google Drive upload did not return a file id for ${filePath}`);
  }

  return uploaded.data.id;
}

async function publishSupabaseAsset(params: {
  target: AssetTarget;
  version: number;
  objectKey: string;
  fileName: string;
  driveFileId: string;
  driveFolderId: string;
  size: number;
  sha256: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { target } = params;
  let deactivateQuery = supabase
    .from("test_pdf_assets")
    .update({ is_active: false })
    .eq("test_id", target.testId)
    .eq("mode", target.mode)
    .eq("asset_kind", "flattened_pdf")
    .eq("is_active", true);

  if (target.mode === "full") {
    deactivateQuery = deactivateQuery.is("section_name", null).is("module_number", null);
  } else {
    deactivateQuery = deactivateQuery.eq("section_name", target.sectionName).is("module_number", null);
  }

  const { error: deactivateError } = await deactivateQuery;
  if (deactivateError) {
    throw new Error(deactivateError.message);
  }

  const { error: insertError } = await supabase.from("test_pdf_assets").insert({
    test_id: target.testId,
    section_name: target.sectionName,
    module_number: null,
    mode: target.mode,
    asset_kind: "flattened_pdf",
    object_key: params.objectKey,
    file_name: params.fileName,
    content_type: "application/pdf",
    sha256: params.sha256,
    file_size_bytes: params.size,
    version: params.version,
    is_active: true,
    storage_provider: "google_drive",
    drive_file_id: params.driveFileId,
    drive_folder_id: params.driveFolderId,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }
}

async function main() {
  const options = parseArgs();
  const files = (await readdir(options.inputDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
    .map((entry) => path.join(options.inputDir, entry.name))
    .sort((left, right) => left.localeCompare(right));
  const targets = files.map(strictTarget).filter((target): target is AssetTarget => Boolean(target));

  if (targets.length !== files.length) {
    throw new Error(`Found ${files.length - targets.length} PDF(s) that do not match strict uuid_kind.pdf naming.`);
  }

  const titleMap = await loadTestTitleMap([...new Set(targets.map((target) => target.testId))]);
  const nextVersionMap = await loadNextVersionMap();
  const drive = options.execute ? getGoogleDriveClient() : (null as unknown as ReturnType<typeof getGoogleDriveClient>);
  const rootFolderId = options.execute ? getGoogleDrivePdfRootFolderId() : "dry-run-root";

  console.log(`Mode: ${options.execute ? "EXECUTE" : "DRY RUN"}`);
  console.log(`Input: ${options.inputDir}`);
  console.log(`Planning ${targets.length} existing raster PDF asset(s). No rasterization will run.`);

  let processed = 0;
  for (const target of targets) {
    const key = getAssetVersionKey(target);
    const version = nextVersionMap.get(key) ?? 1;
    nextVersionMap.set(key, version + 1);
    const objectKey = getLogicalObjectKey(target, version);
    const fileName = getDownloadFileName(target, titleMap.get(target.testId));
    const folderParts = objectKey.split("/").slice(0, -1);
    const size = (await stat(target.inputPath)).size;

    console.log(`[${processed + 1}/${targets.length}] ${target.testId} ${target.kind} -> ${objectKey}`);

    if (!options.execute) {
      console.log(`DRY RUN upload existing file: ${target.inputPath} (${size} bytes)`);
      processed += 1;
      continue;
    }

    const driveFolderId = await ensureDriveFolderPath(drive, rootFolderId, folderParts, true);
    const driveFileId = await uploadDriveFile(drive, target.inputPath, fileName, driveFolderId);
    const sha256 = await sha256File(target.inputPath);
    await publishSupabaseAsset({
      target,
      version,
      objectKey,
      fileName,
      driveFileId,
      driveFolderId,
      size,
      sha256,
    });

    console.log(`Published existing raster ${objectKey}: Drive file ${driveFileId}`);
    processed += 1;
  }

  console.log(`Done. ${options.execute ? "Published" : "Planned"} ${processed} existing raster PDF assets.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
