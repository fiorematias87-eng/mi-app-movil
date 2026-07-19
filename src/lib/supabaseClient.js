import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nlzxmkqqejabjxgupnky.supabase.co';
const supabaseAnonKey = 'sb_publishable_50CH-4J5wqjP5kkP2gJu_w_GY95bFIc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
