import { getAnalytics } from 'firebase/analytics';
import app, { auth, db, storage } from './firebase/config';

export { app, auth, db, storage };
export default app;

export const analytics = typeof window !== 'undefined' && import.meta.env.PROD ? getAnalytics(app) : null;