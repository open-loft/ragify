import { closeDb, getDb } from "../db/db";

async function clearChunks() {
  const db = await getDb();
  const res = await db.collection("chunks").deleteMany({});
  console.log("Deleted documents:", res.deletedCount);
  await closeDb();
}

clearChunks();

/**
 * Script to clear all documents from the "chunks" collection in the MongoDB database.
 * Use with caution as this action is irreversible.
 */
