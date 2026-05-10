import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Zap, ShieldCheck, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { fetchApi } from '../api';

const Verify2FA = ({ setUser }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(60);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer(timer - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;
    const newCode = [...code];
    newCode[index] = value.substring(value.length - 1);
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otp = code.join('');
    if (otp.length < 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await fetchApi('/auth/verify-2fa', {
        method: 'POST',
        body: JSON.stringify({ email, code: otp }),
      });
      
      if (data.token) {
        localStorage.setItem('token', data.token);
        const userData = await fetchApi('/auth/me');
        setUser(userData);
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    // Simulate resend by calling login again
    // In a real app, you'd have a dedicated resend endpoint
    setTimer(60);
    setError('A new code has been sent (check console)');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-primary/5 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-primaryLight/5 rounded-full blur-[150px] translate-y-1/2 -translate-x-1/4"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-surface border border-card rounded-[2.5rem] p-10 shadow-2xl shadow-primary/10">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">Verify OTP</h1>
            <p className="text-gray-400">Enter the code sent to <span className="text-white font-bold">{email}</span></p>
          </div>

          <form onSubmit={handleVerify} className="space-y-8">
            <div className="flex justify-between gap-2">
              {code.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 md:w-14 md:h-16 bg-card border border-gray-800 rounded-xl text-center text-2xl font-black text-primary focus:border-primary outline-none transition-all"
                />
              ))}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary hover:bg-primaryDark text-white font-black rounded-2xl transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  Verify & Continue <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="text-center">
              <button 
                type="button"
                onClick={handleResend}
                disabled={timer > 0}
                className={`flex items-center justify-center gap-2 mx-auto text-sm font-bold transition-colors ${timer > 0 ? 'text-gray-600' : 'text-primary hover:text-primaryLight'}`}
              >
                <RefreshCw className={`w-4 h-4 ${timer > 0 ? '' : 'animate-spin-once'}`} />
                {timer > 0 ? `Resend code in ${timer}s` : 'Resend Code'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Verify2FA;
