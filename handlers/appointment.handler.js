const Appointment = require('../models/appointment.model');
const Doctor = require('../models/doctor.model');
const User = require('../models/user.model');
const { validationResult } = require('express-validator');

const AppointmentHandler = {
  // Create a new appointment
  async createAppointment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { doctorId, patientId, date, timeSlot, type, reason } = req.body;
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      // Parse requested slot
      const [startTime, endTime] = timeSlot.split('-');
      const [reqStart, reqEnd] = [startTime, endTime].map(t => parseInt(t.replace(':', ''), 10));
      // Check if requested slot fits within any available slot
      const weekday = new Date(date).toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
      const daySchedule = doctor.availability.find(s => s.day.toLowerCase() === weekday);
      if (!daySchedule) {
        return res.status(409).json({ message: 'No available slots for this day' });
      }
      let fits = false;
      for (const slot of daySchedule.slots) {
        const [slotStart, slotEnd] = [slot.startTime, slot.endTime].map(t => parseInt(t.replace(':', ''), 10));
        if (reqStart >= slotStart && reqEnd <= slotEnd) {
          fits = true;
          break;
        }
      }
      if (!fits) {
        return res.status(409).json({ message: 'Requested time slot does not fit in available slots' });
      }
      // Check for overlap with existing appointments
      const appointments = await Appointment.find({ doctorId, date, status: { $nin: ['cancelled'] } });
      for (const appt of appointments) {
        const [apptStart, apptEnd] = [appt.startTime, appt.endTime].map(t => parseInt(t.replace(':', ''), 10));
        if (!(reqEnd <= apptStart || reqStart >= apptEnd)) {
          return res.status(409).json({ message: 'Time slot overlaps with another appointment' });
        }
      }
      const appointment = new Appointment({
        doctorId,
        patientId: patientId || req.user.id,
        date,
        startTime,
        endTime,
        type,
        reason,
        status: 'pending'
      });
      await appointment.save();
      res.status(201).json({
        id: appointment._id,
        doctorId: appointment.doctorId,
        patientId: appointment.patientId,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        type: appointment.type,
        reason: appointment.reason,
        status: appointment.status,
        createdAt: appointment.createdAt,
        updatedAt: appointment.updatedAt
      });
    } catch (error) {
      console.error('createAppointment error:', error);
      res.status(500).json({ message: 'Error creating appointment' });
    }
  },

  // Get all appointments for the user or for a doctor if doctorId is provided
  async getAppointments(req, res) {
    try {
      const { doctorId, status, type, page = 1, limit = 10 } = req.query;
      const query = {};
      if (doctorId) query.doctorId = doctorId;
      else query.$or = [{ patientId: req.user.id }, { doctorId: req.user.id }];
      if (status) query.status = status;
      if (type) query.type = type;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [appointments, total] = await Promise.all([
        Appointment.find(query).sort({ date: -1 }).skip(skip).limit(parseInt(limit)),
        Appointment.countDocuments(query)
      ]);
      res.json({ appointments, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
      console.error('getAppointments error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get appointment by ID
  async getAppointment(req, res) {
    try {
      const { id } = req.params;
      const appointment = await Appointment.findById(id);
      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }
      // Only allow doctor or patient to view
      if (
        appointment.patientId.toString() !== req.user.id &&
        appointment.doctorId.toString() !== req.user.id
      ) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      res.json(appointment);
    } catch (error) {
      console.error('getAppointment error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Update appointment status
  async updateAppointmentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const appointment = await Appointment.findById(id);
      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }
      // Only doctor or patient can update
      if (
        appointment.patientId.toString() !== req.user.id &&
        appointment.doctorId.toString() !== req.user.id
      ) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      appointment.status = status;
      await appointment.save();
      res.json(appointment);
    } catch (error) {
      console.error('updateAppointmentStatus error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Update appointment notes (doctor only)
  async updateAppointmentNotes(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const appointment = await Appointment.findById(id);
      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }
      // Only doctor can update notes
      if (appointment.doctorId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      appointment.notes = notes;
      await appointment.save();
      res.json(appointment);
    } catch (error) {
      console.error('updateAppointmentNotes error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get available slots for a doctor and date
  async getAvailableSlots(req, res) {
    try {
      const { doctorId, date } = req.query;
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      // Find the weekday
      const weekday = new Date(date).toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
      const daySchedule = doctor.availability.find(s => s.day.toLowerCase() === weekday);
      if (!daySchedule) {
        return res.json({ slots: [] });
      }
      // Get all appointments for that doctor and date
      const appointments = await Appointment.find({ doctorId, date, status: { $nin: ['cancelled'] } });
      const bookedSlots = appointments.map(a => a.timeSlot);
      // Filter out booked slots
      const availableSlots = daySchedule.slots
        .filter(slot => !bookedSlots.includes(slot.startTime + '-' + slot.endTime))
        .map(slot => slot.startTime + '-' + slot.endTime);
      res.json({ slots: availableSlots });
    } catch (error) {
      console.error('getAvailableSlots error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Reschedule an appointment
  async rescheduleAppointment(req, res) {
    try {
      const { id } = req.params;
      const { date, timeSlot } = req.body;
      const appointment = await Appointment.findById(id);
      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }
      if (appointment.status === 'cancelled') {
        return res.status(409).json({ message: 'Cannot reschedule a cancelled appointment' });
      }
      if (
        appointment.patientId.toString() !== req.user.id &&
        appointment.doctorId.toString() !== req.user.id
      ) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      // Parse requested slot
      const [startTime, endTime] = timeSlot.split('-');
      const [reqStart, reqEnd] = [startTime, endTime].map(t => parseInt(t.replace(':', ''), 10));
      // Check if requested slot fits within any available slot
      const doctor = await Doctor.findById(appointment.doctorId);
      const weekday = new Date(date).toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
      const daySchedule = doctor.availability.find(s => s.day.toLowerCase() === weekday);
      if (!daySchedule) {
        return res.status(409).json({ message: 'No available slots for this day' });
      }
      let fits = false;
      for (const slot of daySchedule.slots) {
        const [slotStart, slotEnd] = [slot.startTime, slot.endTime].map(t => parseInt(t.replace(':', ''), 10));
        if (reqStart >= slotStart && reqEnd <= slotEnd) {
          fits = true;
          break;
        }
      }
      if (!fits) {
        return res.status(409).json({ message: 'Requested time slot does not fit in available slots' });
      }
      // Check for overlap with existing appointments
      const appointments = await Appointment.find({ doctorId: appointment.doctorId, date, status: { $nin: ['cancelled'] }, _id: { $ne: id } });
      for (const appt of appointments) {
        const [apptStart, apptEnd] = [appt.startTime, appt.endTime].map(t => parseInt(t.replace(':', ''), 10));
        if (!(reqEnd <= apptStart || reqStart >= apptEnd)) {
          return res.status(409).json({ message: 'Time slot overlaps with another appointment' });
        }
      }
      appointment.date = date;
      appointment.startTime = startTime;
      appointment.endTime = endTime;
      appointment.status = 'pending';
      await appointment.save();
      res.json(appointment);
    } catch (error) {
      console.error('rescheduleAppointment error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get available slots for a doctor for a date range
  async getAvailableSlotsForRange(req, res) {
    try {
      const { doctorId, startDate, endDate } = req.query;
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start) || isNaN(end) || start > end) {
        return res.status(400).json({ message: 'Invalid date range' });
      }
      const results = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const weekday = d.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
        const daySchedule = doctor.availability.find(s => s.day.toLowerCase() === weekday);
        const dateStr = d.toISOString().slice(0, 10);
        if (!daySchedule) {
          results.push({ date: dateStr, slots: [] });
          continue;
        }
        const appointments = await Appointment.find({ doctorId, date: dateStr, status: { $nin: ['cancelled'] } });
        // For each available slot, break it into 30-min intervals and filter out those overlapping with existing appointments
        const booked = appointments.map(a => [a.startTime, a.endTime].map(t => parseInt(t.replace(':', ''), 10)));
        const availableSlots = [];
        for (const slot of daySchedule.slots) {
          const [slotStart, slotEnd] = [slot.startTime, slot.endTime].map(t => parseInt(t.replace(':', ''), 10));
          // Generate all possible 30-min sub-slots
          let current = slotStart;
          while (current < slotEnd) {
            let next = current + 30;
            if (next > slotEnd) break;
            // Check overlap with booked
            let overlap = false;
            for (const [bStart, bEnd] of booked) {
              if (!(next <= bStart || current >= bEnd)) {
                overlap = true;
                break;
              }
            }
            if (!overlap) {
              // Format as HH:MM-HH:MM
              const format = n => n.toString().padStart(4, '0');
              const s = format(current);
              const e = format(next);
              availableSlots.push(`${s.slice(0,2)}:${s.slice(2)}-${e.slice(0,2)}:${e.slice(2)}`);
            }
            current = next;
          }
        }
        results.push({ date: dateStr, slots: availableSlots });
      }
      res.json({ availability: results });
    } catch (error) {
      console.error('getAvailableSlotsForRange error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Cancel an appointment
  async cancelAppointment(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const appointment = await Appointment.findById(id);
      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }
      // Only doctor or patient can cancel
      if (
        appointment.patientId.toString() !== req.user.id &&
        appointment.doctorId.toString() !== req.user.id
      ) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      if (appointment.status === 'cancelled') {
        return res.status(409).json({ message: 'Appointment already cancelled' });
      }
      appointment.status = 'cancelled';
      appointment.cancellationReason = reason;
      appointment.cancellationTime = new Date();
      await appointment.save();
      res.json({
        id: appointment._id,
        doctorId: appointment.doctorId,
        patientId: appointment.patientId,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        type: appointment.type,
        reason: appointment.reason,
        status: appointment.status,
        cancellationReason: appointment.cancellationReason,
        cancellationTime: appointment.cancellationTime,
        createdAt: appointment.createdAt,
        updatedAt: appointment.updatedAt
      });
    } catch (error) {
      console.error('cancelAppointment error:', error);
      res.status(500).json({ message: 'Error cancelling appointment' });
    }
  }
};

module.exports = AppointmentHandler; 