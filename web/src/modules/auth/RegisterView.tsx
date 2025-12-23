import React, { useState } from 'react';
import { api } from '../../api/client';
import type { AuthState } from '../../state/authTypes';

interface RegisterViewProps {
  onSuccess: (auth: AuthState) => void;
  onBack: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onSuccess, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgCountry, setOrgCountry] = useState('RU');
  const [orgRole, setOrgRole] = useState<'buyer' | 'supplier' | 'both'>('both');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password || !name || !orgName) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api<{
        user: { id: string; email: string; name: string; orgId: string | null };
        org: { id: string; name: string; country: string; role: 'buyer' | 'supplier' | 'both' };
        tokens: { accessToken: string; refreshToken: string; expiresIn: number };
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          name,
          orgName,
          orgCountry,
          orgRole,
        }),
      });

      const auth: AuthState = {
        user: {
          id: res.user.id,
          email: res.user.email,
          name: res.user.name,
          orgId: res.user.orgId,
        },
        org: {
          id: res.org.id,
          name: res.org.name,
          country: res.org.country,
          role: res.org.role,
        },
        tokens: {
          accessToken: res.tokens.accessToken,
          refreshToken: res.tokens.refreshToken,
          expiresIn: res.tokens.expiresIn,
        },
      };

      onSuccess(auth);
    } catch (e: any) {
      console.error('Register failed', e);
      setError('Registration failed. Please check data or try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md sf-card rounded-2xl border border-slate-200 bg-white p-6">
        <button
          onClick={onBack}
          className="text-xs text-slate-500 hover:text-slate-700 mb-4"
        >
          ← Back
        </button>
        <h2 className="text-xl font-extrabold text-slate-900">Create account</h2>
        <p className="mt-1 text-sm text-slate-600">
          Register your organization to start using SilkFlow.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Your name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Company name
            </label>
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
              required
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700">
                Country
              </label>
              <select
                value={orgCountry}
                onChange={(e) => setOrgCountry(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
              >
                <option value="RU">Russia</option>
                <option value="CN">China</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700">
                Role
              </label>
              <select
                value={orgRole}
                onChange={(e) => setOrgRole(e.target.value as any)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
              >
                <option value="buyer">Buyer</option>
                <option value="supplier">Supplier</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          {error ? (
            <div className="text-xs text-red-600 mt-1">{error}</div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className={
              'w-full rounded-xl px-4 py-2.5 text-sm font-extrabold text-white ' +
              (submitting
                ? 'bg-slate-400 cursor-wait'
                : 'bg-[var(--sf-blue-900)] hover:bg-[var(--sf-blue-800)]')
            }
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
};