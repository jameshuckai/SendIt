import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/GlassCard';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

// Consistent logo URL used across the app
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_blackcomb-beta/artifacts/za2ypiek_SendItLogo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await signIn(email, password);
    
    if (error) {
      toast.error(error.message || 'Login failed');
      setLoading(false);
      return;
    }
    
    // Success - navigate to home
    navigate('/home');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: '#12181B' }}>
      <div className="w-full max-w-md">
        {/* Hero Logo */}
        <div className="flex justify-center mb-12">
          <Link 
            to="/home" 
            className="transition-opacity hover:opacity-85"
            style={{ textDecoration: 'none', border: 'none' }}
          >
            <img 
              src={LOGO_URL}
              alt="Sendit Logo" 
              className="h-32 w-32 object-contain"
            />
          </Link>
        </div>

        <GlassCard className="p-8">
          <h1 className="text-3xl font-bold mb-2 text-white text-center" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Welcome Back
          </h1>
          <p className="text-sm mb-8 text-center" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Ready to track your season?
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Email
              </label>
              <input
                data-testid="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: '#1A2126',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  focusRing: '#00B4D8'
                }}
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Password
              </label>
              <div className="relative">
                <input
                  data-testid="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 pr-12"
                  style={{
                    backgroundColor: '#1A2126',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white'
                  }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                  data-testid="toggle-password"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              data-testid="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full font-semibold transition-all mt-6"
              style={{
                background: 'linear-gradient(135deg, #00B4D8 0%, #0077B6 100%)',
                color: '#000000',
                fontFamily: 'Manrope, sans-serif',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 20px rgba(0, 180, 216, 0.3)'
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Don't have an account?{' '}
              <Link to="/signup" className="font-semibold" style={{ color: '#00B4D8' }}>
                Sign up
              </Link>
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
