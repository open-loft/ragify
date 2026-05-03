import { Db, MongoClient } from "mongodb";
import config from "../config";

let mongoClient: MongoClient | null = null;
let connectPromise: Promise<MongoClient> | null = null;

const getMongoClient = async (): Promise<MongoClient> => {
  if (mongoClient) return mongoClient;

  if (!config.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!connectPromise) {
    const client = new MongoClient(config.MONGODB_URI, {
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
    });

    connectPromise = client
      .connect()
      .then(() => {
        mongoClient = client;
        return client;
      })
      .catch((error) => {
        connectPromise = null;
        throw error;
      });
  }

  return connectPromise;
};

const getDb = async (): Promise<Db> => {
  const client = await getMongoClient();
  return client.db(config.MONGODB_DB_NAME);
};

let indexesEnsured = false;

const ensureDbIndexes = async (): Promise<void> => {
  if (indexesEnsured) return;

  const db = await getDb();
  await Promise.all([
    db.collection("chunks").createIndex({ docId: 1, chunkIndex: 1 }, { unique: true }),
    db.collection("chunks").createIndex({ createdAt: -1 }),
    db.collection("documents").createIndex({ uploadedAt: -1 }),
    db.collection("logs").createIndex({ timestamp: -1 }),
    db.collection("logs").createIndex({ context: 1, timestamp: -1 }),
  ]);

  indexesEnsured = true;
};

const closeDb = async (): Promise<void> => {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
  }
  connectPromise = null;
};

const isDbHealthy = async (): Promise<boolean> => {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
};

export { getDb, closeDb, isDbHealthy, getMongoClient, ensureDbIndexes };
