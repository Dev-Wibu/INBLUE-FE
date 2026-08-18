import { useState, useCallback, useEffect, type FormEvent } from 'react';
import { X, ShieldCheck, Monitor, LogIn, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import {
  getAllKiosksApi,
  loginStaffApi,
  type Kiosk,
  type StaffTokenPayload,
} from '@/services/kiosk/kioskApi.service';

const WEB_KIOSK_STORAGE_KEY = 'inblue.currentKiosk';

interface KioskSettingsModalProps {
  isOpen: boolean;
  currentKiosk: Kiosk | null;
  onClose: () => void;
  onKioskSaved: (kiosk: Kiosk) => void;
}

function decodeJwtPayload(token: string): StaffTokenPayload | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function KioskSettingsModal({
  isOpen,
  currentKiosk,
  onClose,
  onKioskSaved,
}: KioskSettingsModalProps) {
  const [mode, setMode] = useState<'LOGIN' | 'SELECT'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode('LOGIN');
      setEmail('');
      setPassword('');
      setError(null);
      setSuccessMessage(null);
      setKiosks([]);
    }
  }, [isOpen]);

  const handleLogin = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu nhân viên.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await loginStaffApi(email.trim(), password.trim());
      const payload = decodeJwtPayload(token);

      if (!payload?.roles?.includes('ROLE_STAFF') && !payload?.roles?.includes('ROLE_ADMIN')) {
        throw new Error('Tài khoản không có quyền quản trị Kiosk (Yêu cầu ROLE_STAFF).');
      }

      setIsLoading(true);

      const kioskList = await getAllKiosksApi(token);
      setKiosks(kioskList);
      setMode('SELECT');
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Đăng nhập nhân viên không thành công.');
    } finally {
      setIsLoading(false);
    }
  }, [email, password]);

  const handleSelectKiosk = useCallback(
    (kiosk: Kiosk) => {
      try {
        localStorage.setItem(WEB_KIOSK_STORAGE_KEY, JSON.stringify(kiosk));
        setSuccessMessage(`Đã thiết lập thành công: ${kiosk.name}`);
        setTimeout(() => {
          onKioskSaved(kiosk);
          onClose();
        }, 800);
      } catch (err) {
        console.warn('Cannot save kiosk config:', err);
      }
    },
    [onKioskSaved, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-[#98cbff]/30 bg-[#121828]/95 p-6 text-white shadow-2xl backdrop-blur-xl sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#98cbff]/15 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#98cbff]/15 text-[#98cbff]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white">Cấu hình trạm Kiosk</h3>
              <p className="text-xs text-[#bec7d4]">
                {mode === 'LOGIN' ? 'Xác thực tài khoản nhân viên vận hành' : 'Chọn thiết bị Kiosk cho máy này'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Config Badge */}
        {currentKiosk && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-300">
            <Monitor className="h-4 w-4" />
            <span>Trạm hiện tại: <strong>{currentKiosk.name}</strong> (ID: #{currentKiosk.id})</span>
          </div>
        )}

        {/* Alert Messages */}
        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Body Content */}
        {mode === 'LOGIN' ? (
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#bec7d4]">
                Email nhân viên (Staff)
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@inblue.vn"
                className="w-full rounded-xl border border-[#98cbff]/20 bg-[#1a2235]/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#98cbff] focus:ring-1 focus:ring-[#98cbff]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#bec7d4]">
                Mật khẩu
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#98cbff]/20 bg-[#1a2235]/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#98cbff] focus:ring-1 focus:ring-[#98cbff]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00a3ff] to-[#0055ff] py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:opacity-95 active:scale-98 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Đăng nhập cấu hình</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-xs font-medium text-[#bec7d4]">
              Danh sách trạm Kiosk ({kiosks.length}):
            </p>
            <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
              {kiosks.map((kiosk) => {
                const isSelected = currentKiosk?.id === kiosk.id;
                return (
                  <button
                    key={kiosk.id}
                    type="button"
                    onClick={() => handleSelectKiosk(kiosk)}
                    className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                      isSelected
                        ? 'border-[#98cbff] bg-[#98cbff]/20 shadow-[0_0_12px_rgba(152,203,255,0.25)]'
                        : 'border-[#98cbff]/15 bg-[#1a2235]/40 hover:border-[#98cbff]/40 hover:bg-[#1a2235]/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Monitor className="h-5 w-5 text-[#98cbff]" />
                      <div>
                        <div className="text-sm font-bold text-white">{kiosk.name}</div>
                        <div className="text-xs text-[#bec7d4]">{kiosk.location || 'Vị trí mặc định'} (ID: #{kiosk.id})</div>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="h-5 w-5 text-[#98cbff]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
