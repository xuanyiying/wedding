import request from "../utils/request";

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
  return await request.get(`/schedule/availability?date=${date}`);
};

const getAppointments = async (start: string, end: string): Promise<Appointment[]> => {
  return await request.get(`/appointments?start=${start}&end=${end}`);
};

const createAppointment = async (appointment: Omit<Appointment, 'id'>): Promise<Appointment> => {
  return await request.post('/appointments', appointment);
};

export const schedule = {
  getAvailability,
  getAppointments,
  createAppointment,
};