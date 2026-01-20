import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import {
  Calendar, Users, Clock,
  LogOut, Activity, Stethoscope,
  ChevronRight, FilePlus, Plus, Trash2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import WalletConnect from '../components/WalletConnect';


// --- Types ---

interface Appointment {
  _id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  slot: string;
  status: 'REQUESTED' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED';
}

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string
}

const DoctorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // --- Prescription Form State ---
  const [isPrescribeOpen, setIsPrescribeOpen] = useState(false);
  const [prescribeLoading, setPrescribeLoading] = useState(false);
  const [selectedAptId, setSelectedAptId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([
    { name: "", dosage: "", frequency: "", duration: "" }
  ]);

  // --- View Records State ---
  const [isRecordsOpen, setIsRecordsOpen] = useState(false);
  const [patientRecords, setPatientRecords] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<any | null>(null); // For detailed view

  // --- 1. Fetch Doctor's Data ---
  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.get('http://127.0.0.1:8000/appointments/doctor/my-appointments', { headers });
      setAppointments(res.data);

    } catch (error) {
      console.error(error);
      toast.error("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // --- 2. Handle Accept Appointment ---
  const handleAccept = async (appointmentId: string) => {
    setActionLoading(appointmentId);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://127.0.0.1:8000/appointments/doctor/${appointmentId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Appointment Confirmed");
      fetchDashboardData();

    } catch (error) {
      toast.error("Failed to accept appointment");
    } finally {
      setActionLoading(null);
    }
  };

  // --- 3. Prescription Form Handlers ---

  const handleAddMedicine = () => {
    setMedicines([...medicines, { name: "", dosage: "", frequency: "", duration: "" }]);
  };

  const handleRemoveMedicine = (index: number) => {
    const newMeds = [...medicines];
    newMeds.splice(index, 1);
    setMedicines(newMeds);
  };

  const handleMedicineChange = (index: number, field: keyof Medicine, value: string) => {
    const newMeds = [...medicines];
    newMeds[index][field] = value;
    setMedicines(newMeds);
  };

  const handleSubmitPrescription = async () => {
    if (!selectedAptId || !diagnosis) {
      toast.error("Please select a patient and enter a diagnosis");
      return;
    }

    setPrescribeLoading(true);
    try {
      const token = localStorage.getItem('token');
      const appointment = appointments.find(a => a._id === selectedAptId);

      if (!appointment) return;

      const payload = {
        appointmentId: selectedAptId,
        patientId: appointment.patientId,
        diagnosis: diagnosis,
        medicines: medicines,
        notes: notes
      };

      await axios.post('http://127.0.0.1:8000/prescriptions/doctor', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Prescription created & secured on blockchain!");
      setIsPrescribeOpen(false);

      // Reset Form
      setDiagnosis("");
      setNotes("");
      setMedicines([{ name: "", dosage: "", frequency: "", duration: "" }]);
      setSelectedAptId("");

    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || "Failed to create prescription");
    } finally {
      setPrescribeLoading(false);
    }
  };

  // --- 4. View Patient Records ---
  const handleViewRecords = async (patientId: string) => {
    setRecordsLoading(true);
    setIsRecordsOpen(true);
    setPatientRecords([]);
    setViewingRecord(null); // Reset detail view

    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://127.0.0.1:8000/prescriptions/patient/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatientRecords(res.data);
      console.log("Records Received:", res.data);
      if (res.data.length === 0) toast("No records found for this patient.");
    } catch (error: any) {
      console.error(error);
      if (error.response && error.response.status === 403) {
        toast.error("Access Denied! Patient has not granted access on the blockchain.");
        setIsRecordsOpen(false); // Close modal if denied
      } else {
        toast.error("Failed: " + (error.response?.data?.detail || error.message));
      }
    } finally {
      setRecordsLoading(false);
    }
  };

  // --- Filters ---
  const pendingAppointments = appointments.filter(a => a.status === 'REQUESTED');

  const todayAppointments = appointments.filter(a => {
    const aptDate = new Date(a.slot).toDateString();
    const today = new Date().toDateString();
    return aptDate === today && a.status === 'ACCEPTED';
  });

  const upcomingAppointments = appointments.filter(a => {
    const aptDate = new Date(a.slot);
    const today = new Date();
    return aptDate > today && a.status === 'ACCEPTED';
  });

  // Approved appointments list for the dropdown
  const approvedAppointments = appointments.filter(a => a.status === 'ACCEPTED');

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans text-slate-900">

      {/* --- HEADER --- */}
      <div className="bg-indigo-900 text-white pt-10 pb-24 px-6 md:px-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
          <Stethoscope size={300} />
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center relative z-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dr. {user?.name}</h1>
            <p className="text-indigo-200 mt-2 flex items-center gap-2 text-sm">
              <Activity size={16} className="text-green-400" />
              Online • Specialist Panel
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-end md:items-center mt-4 md:mt-0">
            <WalletConnect />
            <Button
              variant="ghost"
              onClick={() => { logout(); navigate('/login'); }}
              className="text-indigo-200 hover:text-white hover:bg-indigo-800 gap-2 border border-indigo-700/50"
            >
              <LogOut size={16} /> Log Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-16 space-y-8 relative z-20">

        {/* --- STATS OVERVIEW --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-orange-500 flex flex-col justify-between">
            <div>
              <p className="text-slate-500 font-medium text-sm uppercase tracking-wide">Pending Requests</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-4xl font-bold text-slate-800">{pendingAppointments.length}</span>
                {pendingAppointments.length > 0 && (
                  <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-bold">Action Needed</span>
                )}
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-400">Patients waiting for approval</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-indigo-500 flex flex-col justify-between">
            <div>
              <p className="text-slate-500 font-medium text-sm uppercase tracking-wide">Today's Visits</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-4xl font-bold text-slate-800">{todayAppointments.length}</span>
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-400">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-teal-500 flex flex-col justify-between">
            <div>
              <p className="text-slate-500 font-medium text-sm uppercase tracking-wide">Total Appointments</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-4xl font-bold text-slate-800">{appointments.length}</span>
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-400">Lifetime patient interactions</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* --- LEFT COLUMN: PENDING & TODAY --- */}
          <div className="lg:col-span-2 space-y-8">

            {/* 1. Pending Approvals Section */}
            {pendingAppointments.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-orange-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="text-orange-500" size={20} /> Pending Approvals
                  </h3>
                  <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">
                    {pendingAppointments.length} New
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {pendingAppointments.map((apt) => (
                    <div key={apt._id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-slate-900 text-lg">{apt.patientName}</h4>
                        <p className="text-slate-500 text-sm">Requested for: <span className="font-medium text-slate-700">{new Date(apt.slot).toLocaleString()}</span></p>
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50">
                          Decline
                        </Button>
                        <Button
                          onClick={() => handleAccept(apt._id)}
                          disabled={!!actionLoading}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[100px]"
                        >
                          {actionLoading === apt._id ? "..." : "Accept"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Today's Schedule */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="text-indigo-600" size={20} /> Today's Schedule
                </h3>
              </div>

              {todayAppointments.length === 0 ? (
                <div className="p-10 text-center text-slate-400">
                  <p>No appointments scheduled for today.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {todayAppointments.map((apt) => (
                    <div key={apt._id} className="p-6 hover:bg-slate-50 transition-colors flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center w-16 h-16 bg-indigo-50 rounded-xl text-indigo-700">
                        <span className="text-sm font-bold">{new Date(apt.slot).getHours()}:{new Date(apt.slot).getMinutes().toString().padStart(2, '0')}</span>
                        <span className="text-[10px] uppercase font-medium">{new Date(apt.slot).getHours() >= 12 ? 'PM' : 'AM'}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900">{apt.patientName}</h4>
                        <p className="text-sm text-slate-500">General Consultation</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mr-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        onClick={() => handleViewRecords(apt.patientId)}
                      >
                        History
                      </Button>
                      <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
                        Start Visit <ChevronRight size={16} className="ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* --- RIGHT COLUMN: UPCOMING & ACTIONS --- */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Upcoming</h3>
              </div>

              <div className="p-2">
                {upcomingAppointments.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">
                    No future appointments.
                  </div>
                ) : (
                  upcomingAppointments.slice(0, 5).map((apt) => (
                    <div key={apt._id} className="p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 rounded-lg transition-colors flex justify-between items-center group">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{apt.patientName}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <Calendar size={12} />
                          {new Date(apt.slot).toLocaleDateString()}
                          <span className="text-slate-300">|</span>
                          <Clock size={12} />
                          {new Date(apt.slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 hover:bg-indigo-50"
                        onClick={() => handleViewRecords(apt.patientId)}
                        title="View Medical History"
                      >
                        <FilePlus size={16} />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-slate-100">
                <Button variant="ghost" className="w-full text-indigo-600 text-sm hover:bg-indigo-50">
                  View Full Calendar
                </Button>
              </div>
            </div>

            {/* --- PRESCRIPTION MODAL TRIGGER --- */}
            <div className="mt-6 space-y-3">
              <Dialog open={isPrescribeOpen} onOpenChange={setIsPrescribeOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-slate-900 text-white hover:bg-slate-800 justify-start h-12 gap-3 shadow-sm hover:shadow-md transition-all">
                    <FilePlus size={18} className="text-teal-400" /> Create New Prescription
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FilePlus className="text-teal-600" /> New Prescription
                    </DialogTitle>
                    <DialogDescription>
                      Create a secure, blockchain-verified prescription for your patient.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 py-4">

                    {/* 1. Patient Selector */}
                    <div className="space-y-2">
                      <Label>Select Patient (from Accepted Appointments)</Label>
                      <Select onValueChange={setSelectedAptId} value={selectedAptId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a patient..." />
                        </SelectTrigger>
                        <SelectContent>
                          {approvedAppointments.length === 0 ? (
                            <div className="p-2 text-sm text-slate-500">No accepted appointments found</div>
                          ) : (
                            approvedAppointments.map(a => (
                              <SelectItem key={a._id} value={a._id}>
                                {a.patientName} — {new Date(a.slot).toLocaleDateString()}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 2. Diagnosis */}
                    <div className="space-y-2">
                      <Label>Diagnosis</Label>
                      <Input
                        placeholder="e.g. Acute Bronchitis"
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                      />
                    </div>

                    {/* 3. Medicines List */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label>Medicines</Label>
                        <Button size="sm" variant="outline" onClick={handleAddMedicine} className="h-7 text-xs gap-1">
                          <Plus size={12} /> Add Drug
                        </Button>
                      </div>

                      {medicines.map((med, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <div className="flex-1 space-y-1">
                            {idx === 0 && <span className="text-[10px] text-slate-400 uppercase">Drug Name</span>}
                            <Input
                              placeholder="Paracetamol"
                              value={med.name}
                              onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                            />
                          </div>
                          <div className="w-24 space-y-1">
                            {idx === 0 && <span className="text-[10px] text-slate-400 uppercase">Dosage</span>}
                            <Input
                              placeholder="500mg"
                              value={med.dosage}
                              onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                            />
                          </div>
                          <div className="w-32 space-y-1">
                            {idx === 0 && <span className="text-[10px] text-slate-400 uppercase">Frequency</span>}
                            <Input
                              placeholder="1-0-1"
                              value={med.frequency}
                              onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                            />
                          </div>
                          <div className="w-24 space-y-1">
                            {idx === 0 && <span className="text-[10px] text-slate-400 uppercase">Duration</span>}
                            <Input
                              placeholder="5 Days"
                              value={med.duration}
                              onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                            />
                          </div>
                          <div className="pt-5"> {/* Spacer for labels */}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleRemoveMedicine(idx)}
                              disabled={medicines.length === 1}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 4. Notes */}
                    <div className="space-y-2">
                      <Label>Doctor's Notes / Advice</Label>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Drink plenty of water, rest for 3 days..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>

                    <Button
                      onClick={handleSubmitPrescription}
                      disabled={prescribeLoading}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white h-11"
                    >
                      {prescribeLoading ? "Securing Record..." : "Issue Prescription"}
                    </Button>

                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full bg-white text-slate-700 hover:bg-slate-50 justify-start h-12 gap-3 border border-slate-200">
                    <Users size={18} className="text-indigo-500" /> Patient Directory
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Patient Directory</DialogTitle>
                    <DialogDescription>Select a patient to view their medical history.</DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto">
                    {/* Create Unique List of Patients from Appointments */}
                    {Object.values(
                      appointments.reduce((acc, apt) => {
                        if (!acc[apt.patientId]) acc[apt.patientId] = apt;
                        return acc;
                      }, {} as Record<string, Appointment>)
                    ).map((pt) => (
                      <div
                        key={pt.patientId}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer"
                        onClick={() => handleViewRecords(pt.patientId)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                            {pt.patientName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{pt.patientName}</p>
                            <p className="text-xs text-slate-500">{pt.patientEmail}</p>
                          </div>
                        </div>
                        <Button size="icon" variant="ghost">
                          <ChevronRight size={16} className="text-slate-400" />
                        </Button>
                      </div>
                    ))}
                    {appointments.length === 0 && (
                      <p className="text-center text-slate-500 text-sm py-4">No patients found.</p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* --- RECORDS MODAL --- */}
            <Dialog open={isRecordsOpen} onOpenChange={setIsRecordsOpen}>
              <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {viewingRecord ? (
                      <Button variant="ghost" size="sm" onClick={() => setViewingRecord(null)} className="-ml-3 gap-1 text-slate-600">
                        <ChevronRight className="rotate-180" size={16} /> Back to List
                      </Button>
                    ) : (
                      "Patient Medical History"
                    )}
                  </DialogTitle>
                  <DialogDescription>
                    {viewingRecord ? "Detailed View" : "Blockchain Verified Records"}
                  </DialogDescription>
                </DialogHeader>

                {recordsLoading ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : viewingRecord ? (
                  // --- DETAIL VIEW ---
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                      <h2 className="text-2xl font-bold text-slate-900">{viewingRecord.diagnosis}</h2>
                      <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date(viewingRecord.createdAt).toDateString()}</span>
                        <span className="flex items-center gap-1.5"><Users size={14} /> {viewingRecord.doctorName || viewingRecord.source}</span>
                      </div>
                    </div>

                    {/* Medicines Table */}
                    {viewingRecord.medicines && viewingRecord.medicines.length > 0 && (
                      <div className="bg-white border rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 border-b text-sm font-semibold text-slate-700">Prescribed Medicines</div>
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50/50 text-left text-xs font-semibold text-slate-500 uppercase">
                            <tr>
                              <th className="px-4 py-3">Medicine</th>
                              <th className="px-4 py-3">Dosage</th>
                              <th className="px-4 py-3">Freq</th>
                              <th className="px-4 py-3">Duration</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {viewingRecord.medicines.map((m: any, i: number) => (
                              <tr key={i}>
                                <td className="px-4 py-3 font-medium text-slate-900">{m.name}</td>
                                <td className="px-4 py-3 text-slate-600">{m.dosage}</td>
                                <td className="px-4 py-3 text-slate-600">{m.frequency}</td>
                                <td className="px-4 py-3 text-slate-600">{m.duration}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Notes */}
                    {viewingRecord.notes && (
                      <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-amber-900 text-sm">
                        <span className="font-bold block mb-1">Notes:</span>
                        {viewingRecord.notes}
                      </div>
                    )}

                    {/* Blockchain Hash */}
                    <div className="pt-4 border-t border-slate-100">
                      <p className="text-xs text-slate-400 font-mono mb-1">BLOCKCHAIN VERIFICATION HASH</p>
                      <div className="bg-slate-100 p-2 rounded text-xs font-mono break-all text-slate-600 select-all">
                        {viewingRecord.hash || "Not Available"}
                      </div>
                    </div>
                  </div>
                ) : patientRecords.length === 0 ? (
                  // --- EMPTY STATE ---
                  <div className="text-center p-8 text-slate-500">
                    No records found or accessible.
                  </div>
                ) : (
                  // --- LIST VIEW ---
                  <div className="space-y-4">
                    {patientRecords.map((rec: any, idx) => (
                      <div key={idx} className="p-5 border rounded-xl bg-white hover:shadow-md transition-shadow group">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">
                              {rec.diagnosis}
                            </h4>
                            <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                              {rec.source === 'DOCTOR' ? <Stethoscope size={14} className="text-indigo-500" /> : <Users size={14} className="text-orange-500" />}
                              Source: <span className="font-medium">{rec.doctorName || rec.source}</span>
                            </p>
                          </div>
                          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                            {new Date(rec.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex gap-2 text-xs">
                            <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md font-medium border border-blue-100">
                              {rec.medicines ? rec.medicines.length : 0} Medicines
                            </span>
                            {rec.hash && (
                              <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-md font-medium border border-green-100 flex items-center gap-1">
                                <Activity size={12} /> Verified
                              </span>
                            )}
                          </div>
                          <Button size="sm" onClick={() => setViewingRecord(rec)} variant="outline" className="h-8 gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                            View Details <ChevronRight size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;