import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  BellOff,
  Check,
  Loader2,
  ShieldCheck,
  Star,
  UserRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { chatService } from '../../services/chatService';
import { userService } from '../../services/userService';

const ROLE_LABELS = {
  CUSTOMER: 'Học viên Nutrican',
  PT_CERTIFIED: 'Huấn luyện viên được chứng nhận',
  PT_FREELANCE: 'Huấn luyện viên Nutrican',
  ADMIN: 'Quản trị viên',
};

const GOAL_LABELS = {
  WEIGHT_LOSS: 'Giảm cân / Giảm mỡ',
  WEIGHT_GAIN: 'Tăng cân',
  MUSCLE_GAIN: 'Tăng cơ',
  MAINTENANCE: 'Duy trì vóc dáng',
  HEALTH_IMPROVEMENT: 'Cải thiện sức khỏe',
};

const DIET_LABELS = {
  BALANCED: 'Cân bằng',
  LOW_CARB: 'Ít tinh bột',
  HIGH_PROTEIN: 'Giàu đạm',
  VEGETARIAN: 'Ăn chay',
  VEGAN: 'Thuần chay',
  KETO: 'Keto',
  PALEO: 'Paleo',
  MEDITERRANEAN: 'Địa Trung Hải',
};

const TRAINING_LABELS = {
  ONLINE: 'Trực tuyến',
  OFFLINE: 'Trực tiếp',
  HYBRID: 'Kết hợp',
};

function initials(name) {
  return name
    ? name.split(' ').filter(Boolean).map((part) => part[0]).join('').toUpperCase().slice(0, 2)
    : 'US';
}

function memberSince(date) {
  if (!date) return 'Đang cập nhật';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? 'Đang cập nhật'
    : parsed.toLocaleDateString('vi-VN');
}

function InfoCard({ label, children }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-4">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1 flex min-h-10 items-start text-sm font-extrabold leading-5 text-slate-800 [overflow-wrap:anywhere]">
        {children}
      </div>
    </div>
  );
}

export default function ChatParticipantProfileModal({
  open,
  thread,
  onClose,
  onPreferenceChange,
}) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (!open || !thread?.participantId || !thread?.mappingId) return;
    let active = true;
    setLoading(true);
    setNotificationsEnabled(thread.notificationsEnabled !== false);

    Promise.allSettled([
      userService.getUserById(thread.participantId),
      chatService.getNotificationPreference(thread.mappingId),
    ]).then(([profileResult, preferenceResult]) => {
      if (!active) return;
      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value.data?.data || null);
      } else {
        setProfile(null);
      }
      if (preferenceResult.status === 'fulfilled') {
        setNotificationsEnabled(preferenceResult.value.data?.data?.enabled !== false);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [open, thread?.mappingId, thread?.notificationsEnabled, thread?.participantId]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  if (!open || !thread) return null;

  const displayName = profile?.fullName || thread.participantName || 'Người dùng Nutrican';
  const avatarUrl = profile?.avatarUrl || thread.participantAvatarUrl;
  const role = profile?.role || '';
  const isPt = role.startsWith('PT') || Boolean(profile?.ptProfile);
  const verified = isPt ? profile?.ptProfile?.isVerified : profile?.isKycVerified;
  const rating = profile?.ptProfile?.rating;

  const toggleNotifications = async () => {
    if (saving) return;
    const nextEnabled = !notificationsEnabled;
    setSaving(true);
    try {
      const response = await chatService.updateNotificationPreference(thread.mappingId, nextEnabled);
      const savedEnabled = response.data?.data?.enabled !== false;
      setNotificationsEnabled(savedEnabled);
      onPreferenceChange?.(thread.mappingId, savedEnabled);
      toast.success(savedEnabled
        ? `Đã bật thông báo từ ${displayName}`
        : `Đã tắt thông báo từ ${displayName}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật thông báo');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Hồ sơ của ${displayName}`}
      onMouseDown={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-slate-100 bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="relative h-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white transition hover:bg-black/45"
            aria-label="Đóng hồ sơ"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pb-6 sm:px-8">
          <div className="-mt-8 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-end">
            <div className="relative h-24 w-24 shrink-0 rounded-full border-4 border-white bg-blue-100 p-1 shadow-xl">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full rounded-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-2xl font-black text-blue-700">
                  {initials(displayName)}
                </div>
              )}
              {verified && (
                <span className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-emerald-500 p-1 text-white">
                  <Check className="h-4 w-4 stroke-[3]" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 pb-1">
              <h2 className="truncate text-2xl font-black text-slate-900">{displayName}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {verified && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    <ShieldCheck className="h-3.5 w-3.5" /> Đã xác thực
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  <UserRound className="h-3.5 w-3.5" />
                  {ROLE_LABELS[role] || (isPt ? 'Huấn luyện viên Nutrican' : 'Thành viên Nutrican')}
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <InfoCard label="Vai trò">{isPt ? 'Huấn luyện viên' : 'Học viên'}</InfoCard>
                <InfoCard label="Hình thức">
                  {TRAINING_LABELS[profile?.ptProfile?.trainingMode || thread.selectedTrainingMode]
                    || 'Coaching'}
                </InfoCard>
                <InfoCard label={isPt ? 'Đánh giá' : 'Trạng thái'}>
                  {isPt && rating != null ? (
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      {Number(rating).toFixed(1)} <Star className="h-3.5 w-3.5 fill-current" />
                    </span>
                  ) : 'Đang đồng hành'}
                </InfoCard>
                <InfoCard label="Thành viên từ">{memberSince(profile?.createdAt)}</InfoCard>
              </div>

              {isPt ? (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <p className="text-[11px] font-black uppercase tracking-wide text-blue-700">
                    Giới thiệu huấn luyện viên
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {profile?.ptProfile?.bio || profile?.ptProfile?.trainingPhilosophy
                      || 'Huấn luyện viên đang đồng hành cùng bạn trên Nutrican.'}
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <p className="text-[11px] font-black uppercase tracking-wide text-blue-700">
                    Mục tiêu và chế độ
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700">
                      Mục tiêu: {GOAL_LABELS[profile?.nutritionGoal] || 'Đang cập nhật'}
                    </span>
                    <span className="rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700">
                      Chế độ ăn: {DIET_LABELS[profile?.dietPreference] || 'Đang cập nhật'}
                    </span>
                  </div>
                </div>
              )}

              <div className={`mt-4 rounded-2xl border p-4 ${
                notificationsEnabled
                  ? 'border-emerald-200 bg-emerald-50/70'
                  : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                    notificationsEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {notificationsEnabled
                      ? <Bell className="h-5 w-5" />
                      : <BellOff className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900">Thông báo tin nhắn</p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">
                      Khi tắt, tin nhắn vẫn được nhận trong cuộc trò chuyện nhưng sẽ không hiện toast hoặc chuông thông báo.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notificationsEnabled}
                    disabled={saving}
                    onClick={toggleNotifications}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                      notificationsEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                    } disabled:opacity-60`}
                    aria-label={notificationsEnabled ? 'Tắt thông báo' : 'Bật thông báo'}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      notificationsEnabled ? 'left-6' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
            <p className="text-xs font-medium text-slate-400">
              Thông tin liên hệ riêng tư được Nutrican bảo mật.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Đóng hồ sơ
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
