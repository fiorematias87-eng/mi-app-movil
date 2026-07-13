import { getAnalytics } from 'firebase/analytics';
import app, { auth, db, storage } from './firebase/config';

export { auth, db, storage };
export default app;

export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;