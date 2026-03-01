import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables check:', {
    url: supabaseUrl ? 'present' : 'MISSING',
    key: supabaseAnonKey ? 'present' : 'MISSING',
    allEnv: Object.keys(process.env).filter(key => key.startsWith('REACT_APP_'))
  });
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please ensure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set in .env file. ' +
    'After adding them, restart the frontend: sudo supervisorctl restart frontend'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
