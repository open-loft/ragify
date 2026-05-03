import createHttpError from "http-errors";
import formidable, { File } from "formidable";
import fs from "fs";
import path from "path";
import { Queue } from "bullmq";
import config from "../../config";
import serviceLogger from "../../utils/serviceLogger";
import { getDb } from "../../db/db";
import { getRedisConnectionOptions } from "../../db/redis";

type ParsedForm = {
  fields: formidable.Fields;
  files: formidable.Files;
};

class UploadService {
  private uploadDir: string;
  private ingestQueue: Queue;
  private uploadDirReady: Promise<void>;

  constructor() {
    this.uploadDir = path.resolve(config.STORAGE_PATH);
    this.uploadDirReady = fs.promises
      .mkdir(this.uploadDir, { recursive: true })
      .then(() => undefined);

    this.ingestQueue = new Queue("ingest", {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: {
        attempts: config.INGEST_JOB_ATTEMPTS,
        backoff: { type: "exponential", delay: config.INGEST_JOB_BACKOFF_MS },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    });
  }

  private parseForm = (req: any): Promise<ParsedForm> =>
    new Promise((resolve, reject) => {
      const form = formidable({
        multiples: true,
        uploadDir: this.uploadDir,
        keepExtensions: true,
        maxFileSize: config.UPLOAD_MAX_FILE_SIZE_BYTES,
        maxFiles: config.UPLOAD_MAX_FILES,
      });

      form.parse(req, (err, fields, files) => {
        if (err) {
          return reject(createHttpError(400, `Upload parse failed: ${err.message}`));
        }
        return resolve({ fields, files });
      });
    });

  private normalizeFiles = (files: formidable.Files): File[] => {
    const normalized: File[] = [];
    for (const fileValue of Object.values(files || {})) {
      const fileList = Array.isArray(fileValue) ? fileValue : [fileValue];
      for (const file of fileList as File[]) {
        normalized.push(file);
      }
    }
    return normalized;
  };

  private assertSupportedFile = (file: File) => {
    const mime = (file.mimetype || "").toLowerCase();
    const originalName = file.originalFilename || path.basename(file.filepath);
    const ext = path.extname(originalName).toLowerCase();

    const allowedByMime = config.UPLOAD_ALLOWED_MIME_TYPES.includes(mime);
    const allowedByExt = config.UPLOAD_ALLOWED_EXTENSIONS.includes(ext);

    if (!allowedByMime && !allowedByExt) {
      throw createHttpError(
        415,
        `Unsupported file type for '${originalName}'. Allowed MIME types: ${config.UPLOAD_ALLOWED_MIME_TYPES.join(
          ", "
        )}`
      );
    }
  };

  async handleUpload(req: any, res: any): Promise<void> {
    const db = await getDb();

    try {
      await this.uploadDirReady;
      const { fields, files } = await this.parseForm(req);
      const storedDocs: any[] = [];
      const forceRaw = Array.isArray(fields.forceReingest)
        ? fields.forceReingest[0]
        : fields.forceReingest;
      const forceReingest = String(forceRaw || "false").toLowerCase() === "true";

      const textField = Array.isArray(fields.text) ? fields.text[0] : fields.text;
      if (typeof textField === "string" && textField.trim()) {
        const textPayload = textField.trim();
        if (Buffer.byteLength(textPayload, "utf8") > config.UPLOAD_MAX_FILE_SIZE_BYTES) {
          throw createHttpError(413, "Uploaded text field exceeds maximum size");
        }

        const doc = {
          fileName: "pasted_text",
          fileType: "text/plain",
          text: textPayload,
          uploadedAt: new Date(),
        };
        const result = await db.collection("documents").insertOne(doc);
        const docId = result.insertedId.toString();
        storedDocs.push({ id: result.insertedId, doc });
        await this.ingestQueue.add(
          "ingest-doc",
          {
            docId,
            forceReingest,
            sourceLabel: "text_field",
          },
          {
            jobId: `ingest-${docId}`,
          }
        );
      }

      const normalizedFiles = this.normalizeFiles(files);
      if (normalizedFiles.length > config.UPLOAD_MAX_FILES) {
        throw createHttpError(
          413,
          `Too many files. Maximum allowed is ${config.UPLOAD_MAX_FILES}.`
        );
      }

      for (const file of normalizedFiles) {
        this.assertSupportedFile(file);

        const content = await fs.promises.readFile(file.filepath, {
          encoding: "utf-8",
        });

        if (!content.trim()) {
          throw createHttpError(
            400,
            `Uploaded file '${file.originalFilename || file.newFilename}' is empty`
          );
        }

        const doc = {
          fileName: file.originalFilename || path.basename(file.filepath),
          fileType: file.mimetype || "text/plain",
          text: content,
          uploadedAt: new Date(),
          storedPath: file.filepath,
        };
        const result = await db.collection("documents").insertOne(doc);
        const docId = result.insertedId.toString();
        storedDocs.push({ id: result.insertedId, doc });
        await this.ingestQueue.add(
          "ingest-doc",
          {
            docId,
            forceReingest,
            sourceLabel: "upload_file",
          },
          {
            jobId: `ingest-${docId}`,
          }
        );
      }

      if (!storedDocs.length) {
        throw createHttpError(400, "No valid text or files were provided");
      }

      await serviceLogger(
        db,
        "info",
        "upload",
        `Uploaded ${storedDocs.length} documents`,
        {
          docs: storedDocs.map((item) => String(item.id)),
          forceReingest,
        }
      );

      res.send({
        ok: true,
        inserted: storedDocs.length,
        docs: storedDocs.map((s) => ({ id: s.id })),
      });
    } catch (e: any) {
      await serviceLogger(
        db,
        "error",
        "upload_failed",
        "Upload handling failed",
        e?.message || e
      );

      if (e?.status) throw e;
      throw createHttpError(500, "Internal server error");
    }
  }
}

export default UploadService;
