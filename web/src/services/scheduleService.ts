import api from './api';

export interface User {
  id: number;
  nickname: string;
  avatar?: string;
}

export interface DayAvailability {
  date: string;
  status: 'available' | 'partial' | 'unavailable';
  message?: string;
  availableHosts?: User[];
  bookedEvents?: {
    lunch?: boolean;
    dinner?: boolean;
  };
}

export interface Appointment {
  id: number;
  title: string;
  start: string;
  end: string;
}

const getAvailability = async (date: string): Promise<DayAvailability[]> => {
  const response = await api.get(`/schedule/availability?date=${date}`);
  return response.data;
};

const getAppointments = async (start: string, end: string): Promise<Appointment[]> => {
  const response = await api.get(`/appointments?start=${start}&end=${end}`);
  return response.data;
};

const createAppointment = async (appointment: Omit<Appointment, 'id'>): Promise<Appointment> => {
  const response = await api.post('/appointments', appointment);
  return response.data;
};

export const scheduleService = {
  getAvailability,
  getAppointments,
  createAppointment,
};