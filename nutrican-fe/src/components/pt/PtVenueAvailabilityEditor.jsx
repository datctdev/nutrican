import { Plus, Trash2, MapPin, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { DAY_LABELS, sessionMinutesFromRateUnit, weekScheduleToAvailabilityWindows } from '../../utils/offlineHireSlots';

const newVenue = () => ({
  _key: Math.random().toString(36).slice(2),
  name: '',
  address: '',
  mapsUrl: '',
  note: '',
});

export default function PtVenueAvailabilityEditor({
  venues,
  onVenuesChange,
  weekSchedule,
  onWeekScheduleChange,
  offlineRateUnit = 'SESSION_60',
  showVenueApiActions = false,
  onSaveVenue,
  onDeactivateVenue,
  editingVenueId,
  onEditVenue,
  onResetVenueForm,
  venueForm,
  onVenueFormChange,
  savingVenue = false,
}) {
  const slotMinutes = sessionMinutesFromRateUnit(offlineRateUnit);

  const addVenue = () => {
    onVenuesChange([...(venues || []), newVenue()]);
  };

  const updateVenue = (index, field, value) => {
    onVenuesChange(venues.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  };

  const removeVenue = (index) => {
    if ((venues || []).length <= 1) return;
    onVenuesChange(venues.filter((_, i) => i !== index));
  };

  const updateDay = (dayOfWeek, patch) => {
    onWeekScheduleChange(
      weekSchedule.map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row)),
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
        <div className="mb-3 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-emerald-600" />
          <h4 className="font-bold text-slate-800">Địa điểm tập *</h4>
        </div>
        <p className="mb-4 text-sm text-slate-600">Thêm ít nhất một nơi bạn có thể gặp học viên offline.</p>

        {showVenueApiActions ? (
          <div className="space-y-3">
            {(venues || []).filter((v) => v.active !== false).map((venue) => (
              <div key={venue.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="font-bold text-slate-900">{venue.name}</p>
                <p className="mt-1 text-sm text-slate-600">{venue.address}</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onEditVenue?.(venue)}>Sửa</Button>
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => onDeactivateVenue?.(venue.id)}>Ẩn</Button>
                </div>
              </div>
            ))}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <input value={venueForm?.name || ''} onChange={(e) => onVenueFormChange?.({ ...venueForm, name: e.target.value })} placeholder="Tên phòng gym / studio" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              <input value={venueForm?.address || ''} onChange={(e) => onVenueFormChange?.({ ...venueForm, address: e.target.value })} placeholder="Địa chỉ đầy đủ" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              <input value={venueForm?.mapsUrl || ''} onChange={(e) => onVenueFormChange?.({ ...venueForm, mapsUrl: e.target.value })} placeholder="Link Google Maps (tuỳ chọn)" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              <textarea value={venueForm?.note || ''} onChange={(e) => onVenueFormChange?.({ ...venueForm, note: e.target.value })} placeholder="Ghi chú (tuỳ chọn)" rows={2} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              <div className="flex gap-2">
                <Button onClick={onSaveVenue} disabled={savingVenue} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                  {savingVenue ? 'Đang lưu...' : editingVenueId ? 'Cập nhật địa điểm' : 'Thêm địa điểm'}
                </Button>
                {editingVenueId && (
                  <Button variant="outline" onClick={onResetVenueForm}>Huỷ</Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {(venues || []).map((venue, index) => (
              <div key={venue._key || venue.id || index} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700">Địa điểm #{index + 1}</span>
                  {(venues || []).length > 1 && (
                    <button type="button" onClick={() => removeVenue(index)} className="text-slate-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <input value={venue.name} onChange={(e) => updateVenue(index, 'name', e.target.value)} placeholder="Tên phòng gym / studio *" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                  <input value={venue.address} onChange={(e) => updateVenue(index, 'address', e.target.value)} placeholder="Địa chỉ đầy đủ *" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                  <input value={venue.mapsUrl || ''} onChange={(e) => updateVenue(index, 'mapsUrl', e.target.value)} placeholder="Link Google Maps (tuỳ chọn)" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                  <input value={venue.note || ''} onChange={(e) => updateVenue(index, 'note', e.target.value)} placeholder="Ghi chú (tuỳ chọn)" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                </div>
              </div>
            ))}
            <button type="button" onClick={addVenue} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-500 hover:border-emerald-400 hover:text-emerald-600">
              <Plus className="h-4 w-4" /> Thêm địa điểm
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          <h4 className="font-bold text-slate-800">Lịch cả tuần *</h4>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          Bật các ngày bạn nhận học viên. Mỗi buổi dài {slotMinutes} phút (theo gói offline).
        </p>
        <div className="space-y-2">
          {weekSchedule.map((row) => (
            <div key={row.dayOfWeek} className={`grid grid-cols-1 gap-2 rounded-xl border p-3 sm:grid-cols-[auto_1fr_1fr_1fr] ${row.enabled ? 'border-blue-200 bg-white' : 'border-slate-200 bg-slate-50/80'}`}>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => updateDay(row.dayOfWeek, { enabled: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-400"
                />
                {DAY_LABELS[row.dayOfWeek]}
              </label>
              <input
                type="time"
                disabled={!row.enabled}
                value={row.startTime?.slice(0, 5) || '08:00'}
                onChange={(e) => updateDay(row.dayOfWeek, { startTime: e.target.value })}
                className="rounded-xl border border-slate-200 px-2 py-2 text-sm disabled:opacity-50"
              />
              <input
                type="time"
                disabled={!row.enabled}
                value={row.endTime?.slice(0, 5) || '17:00'}
                onChange={(e) => updateDay(row.dayOfWeek, { endTime: e.target.value })}
                className="rounded-xl border border-slate-200 px-2 py-2 text-sm disabled:opacity-50"
              />
              <span className="self-center text-xs font-semibold text-slate-500">
                {row.enabled ? `${slotMinutes} phút/buổi` : 'Nghỉ'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { weekScheduleToAvailabilityWindows, newVenue };
