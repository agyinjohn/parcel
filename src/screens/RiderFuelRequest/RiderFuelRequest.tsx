import React, { useState } from 'react';
import { Fuel, FileText, CheckCircle, XCircle, Clock, Plus } from 'lucide-react';
import { BottomSheet, EmptyState, StatusPill } from '../../components/rider/RiderUI';
import axios from 'axios';
import { API_ENDPOINTS } from '../../config/api';
import authService from '../../services/authService';
import { useToast } from '../../components/ui/toast';

interface FuelRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
  riderInfo: {
    riderId: string;
    riderName: string;
    riderPhoneNumber: string;
    stationName: string;
  };
  officeId: string;
  station: string;
  notes: string;
  tank: string;
  amount: number | null;
  fuleStationPhoneNumber: string;
  attendantPhoneNumber: string;
  createdAt: number;
  updatedAt: number;
}

const RiderFuelRequest: React.FC = () => {
  const { showToast } = useToast();
  const [fuelType, setFuelType] = useState<'FULL_TANK' | 'HALF_TANK' | 'LITRES'>('FULL_TANK');
  const [litres, setLitres] = useState('');
  const [stationName, setStationName] = useState('');
  const [stationNumber, setStationNumber] = useState('');
  const [attendantNumber, setAttendantNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<FuelRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fuelStations = ['Shell', 'Total', 'Goil', 'Puma', 'Allied', 'Star Oil', 'Benab Oil', 'Zen Petroleum'];

  const loadRequests = async () => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.RIDER}/fuel-requests`, {
        headers: { Authorization: `Bearer ${authService.getToken()}` }
      });
      setRequests(response.data.content || []);
    } catch (error) {
      console.error('Failed to load requests:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone numbers (must be exactly 9 digits and not start with 0)
    if (stationNumber.length !== 9 || !/^[0-9]{9}$/.test(stationNumber)) {
      showToast('Fuel station number must be exactly 9 digits', 'error');
      return;
    }

    if (stationNumber.startsWith('0')) {
      showToast('Fuel station number cannot start with 0', 'error');
      return;
    }

    if (attendantNumber.length !== 9 || !/^[0-9]{9}$/.test(attendantNumber)) {
      showToast('Attendant number must be exactly 9 digits', 'error');
      return;
    }

    if (attendantNumber.startsWith('0')) {
      showToast('Attendant number cannot start with 0', 'error');
      return;
    }

    setLoading(true);

    try {
      await axios.post(
        `${API_ENDPOINTS.RIDER}/fuel-request`,
        {
          station: stationName,
          fuelStationNumber: `+233${stationNumber}`,
          attendantNumber: `+233${attendantNumber}`,
          notes,
          tank: fuelType === 'LITRES' ? litres : fuelType
        },
        { headers: { Authorization: `Bearer ${authService.getToken()}` } }
      );

      showToast('Fuel request submitted successfully!', 'success');
      setFuelType('FULL_TANK');
      setLitres('');
      setStationName('');
      setStationNumber('');
      setAttendantNumber('');
      setNotes('');
      setIsModalOpen(false);
      loadRequests();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to submit fuel request', 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadRequests();
  }, []);

  const statusTone: Record<FuelRequest['status'], string> = {
    PENDING: 'pending',
    APPROVED: 'approved',
    COMPLETED: 'completed',
    REJECTED: 'rejected',
  };

  const getFuelTypeLabel = (tank: string) => {
    if (tank === 'FULL_TANK') return 'Full tank';
    if (tank === 'HALF_TANK') return 'Half tank';
    return /^\d+(\.\d+)?$/.test(tank) ? `${tank} litres` : tank.replace('_', ' ').toLowerCase();
  };

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  const phoneField = (label: string, value: string, set: (v: string) => void) => (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <div className="mt-1.5 flex h-12 rounded-2xl border border-gray-200 overflow-hidden focus-within:border-neutral-900">
        <span className="px-3.5 flex items-center bg-gray-50 text-gray-600 text-sm border-r border-gray-200">+233</span>
        <input
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '');
            if (v.length <= 9 && !v.startsWith('0')) set(v);
          }}
          className="flex-1 px-3 text-base outline-none"
          placeholder="24 123 4567"
          maxLength={9}
          required
        />
      </div>
    </label>
  );

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04]">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center">
            <Fuel className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="font-bold">Need fuel?</p>
            <p className="text-sm text-gray-500">
              {pendingCount > 0 ? `${pendingCount} request${pendingCount === 1 ? '' : 's'} waiting for approval` : 'Send a request to your station manager.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-4 w-full h-12 rounded-2xl bg-[#ea690c] text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <Plus className="w-5 h-5" /> New fuel request
        </button>
      </section>

      <div>
        <h2 className="font-bold px-1 mb-2">Recent requests</h2>
        {requests.length === 0 ? (
          <EmptyState icon={<FileText className="w-8 h-8" />} title="No fuel requests yet" />
        ) : (
          <ul className="rounded-3xl bg-white divide-y divide-gray-100 overflow-hidden shadow-sm ring-1 ring-black/[0.04]">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3.5">
                <span className="h-9 w-9 shrink-0 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                  {r.status === 'APPROVED' || r.status === 'COMPLETED' ? <CheckCircle className="w-5 h-5" />
                    : r.status === 'REJECTED' ? <XCircle className="w-5 h-5 text-red-600" />
                    : <Clock className="w-5 h-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{r.station || 'Fuel station'}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {getFuelTypeLabel(r.tank)} · {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    {r.amount ? ` · GHC ${r.amount.toFixed(2)}` : ''}
                  </p>
                </div>
                <StatusPill tone={statusTone[r.status]}>{r.status.charAt(0) + r.status.slice(1).toLowerCase()}</StatusPill>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BottomSheet
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New fuel request"
        footer={
          <button
            type="submit"
            form="fuel-request-form"
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-[#ea690c] text-white font-semibold disabled:opacity-60"
          >
            {loading ? 'Sending...' : 'Send request'}
          </button>
        }
      >
        <form id="fuel-request-form" onSubmit={handleSubmit} className="space-y-4 pb-2">
          <div>
            <span className="text-sm font-semibold">How much?</span>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {([['FULL_TANK', 'Full tank'], ['HALF_TANK', 'Half tank'], ['LITRES', 'Litres']] as const).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFuelType(v)}
                  className={`h-12 rounded-2xl border-2 text-sm font-semibold transition ${
                    fuelType === v ? 'border-neutral-900 text-neutral-900' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {fuelType === 'LITRES' && (
            <label className="block">
              <span className="text-sm font-semibold">Litres</span>
              <input
                type="number"
                inputMode="decimal"
                min="1"
                value={litres}
                onChange={(e) => setLitres(e.target.value)}
                className="mt-1.5 w-full h-12 px-4 rounded-2xl border border-gray-200 text-base"
                placeholder="e.g. 10"
                required
              />
            </label>
          )}

          <div>
            <span className="text-sm font-semibold">Fuel station</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {fuelStations.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStationName(st)}
                  className={`h-10 px-4 rounded-full border text-sm font-medium transition ${
                    stationName === st ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
            {/* keeps native "required" validation for the station choice */}
            <input tabIndex={-1} aria-hidden className="sr-only" value={stationName} onChange={() => {}} required />
          </div>

          {phoneField('Fuel station number', stationNumber, setStationNumber)}
          {phoneField('Attendant number', attendantNumber, setAttendantNumber)}

          <label className="block">
            <span className="text-sm font-semibold">Notes <span className="font-normal text-gray-500">(optional)</span></span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5 w-full px-4 py-3 rounded-2xl border border-gray-200 text-base resize-none"
              placeholder="Anything the manager should know"
              rows={3}
            />
          </label>
        </form>
      </BottomSheet>
    </div>
  );
};

export default RiderFuelRequest;
