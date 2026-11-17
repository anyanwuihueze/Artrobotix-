import fs from 'fs';
import path from 'path';
import {
  applicationDefault,
  cert,
  initializeApp,
  getApps,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const firebaseConfig = JSON.parse(
  fs.readFileSync(
    path.resolve(process.cwd(), 'firebase-applet-config.json'),
    'utf8'
  )
) as { projectId: string };

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

const credential = serviceAccountJson
  ? cert(JSON.parse(serviceAccountJson))
  : applicationDefault();

if (!getApps().length) {
  initializeApp({
    credential,
    projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  });
}

export const adminAuth = getAuth();
