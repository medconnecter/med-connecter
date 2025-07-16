const express = require('express');
const { body, validationResult } = require('express-validator');
const Doctor = require('../models/doctor.model');
const User = require('../models/user.model');

const router = express.Router();

router.post('/help-me-choose', [
  body('symptoms').isArray().withMessage('Symptoms must be an array'),
  body('languages').optional().isArray().withMessage('Languages must be an array'),
  body('urgency').optional().isIn(['low', 'medium', 'high']).withMessage('Valid urgency level required'),
  body('preferredGender').optional().isIn(['male', 'female', 'no_preference']).withMessage('Valid gender preference required'),
  body('insuranceProvider').optional().isString().withMessage('Insurance provider must be a string')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { 
      symptoms = [], 
      languages = ['en', 'nl'], 
      urgency = 'medium',
      preferredGender = 'no_preference',
      insuranceProvider = null
    } = req.body;

    // Map symptoms to specialties based on a basic rule set
    // In a real system, this would be much more sophisticated
    const specialtyMap = {
      'headache': ['General Practitioner', 'Neurologist'],
      'migraine': ['Neurologist'],
      'back pain': ['Orthopedist', 'Rheumatologist'],
      'chest pain': ['Cardiologist', 'Pulmonologist'],
      'abdominal pain': ['Gastroenterologist', 'General Practitioner'],
      'cough': ['Pulmonologist', 'General Practitioner'],
      'fever': ['General Practitioner', 'Infectious Disease'],
      'rash': ['Dermatologist'],
      'joint pain': ['Rheumatologist', 'Orthopedist'],
      'fatigue': ['General Practitioner', 'Endocrinologist'],
      'depression': ['Psychiatrist', 'Psychologist'],
      'anxiety': ['Psychiatrist', 'Psychologist'],
      'shortness of breath': ['Pulmonologist', 'Cardiologist'],
      'dizziness': ['Neurologist', 'ENT Specialist'],
      'vision problems': ['Ophthalmologist'],
      'hearing problems': ['ENT Specialist'],
      'skin issues': ['Dermatologist'],
      'digestive problems': ['Gastroenterologist'],
      'urinary problems': ['Urologist', 'Nephrologist'],
      'sleep problems': ['Neurologist', 'Psychiatrist'],
      'weight changes': ['Endocrinologist', 'General Practitioner'],
      'allergies': ['Allergist', 'Immunologist']
    };
    
    // Determine relevant specialties based on symptoms
    const relevantSpecialties = new Set();
    
    symptoms.forEach(symptom => {
      const matchedSpecialties = specialtyMap[symptom.toLowerCase()] || ['General Practitioner'];
      matchedSpecialties.forEach(s => relevantSpecialties.add(s));
    });
    
    // Convert to array and add weight to each specialty based on symptom matches
    const specialtiesArray = Array.from(relevantSpecialties);
    
    // Build the base query for doctors
    let query = {
      specialties: { $in: specialtiesArray },
      verified: true,
      verificationStatus: 'verified'
    };
    
    // Add insurance filter if provided
    if (insuranceProvider) {
      query.acceptsInsurance = insuranceProvider;
    }
    
    // Get matching doctors
    let doctors = await Doctor.find(query).limit(50);
    
    // Join with user data to get language and gender info
    const doctorIds = doctors.map(d => d.userId);
    const doctorUsers = await User.find({ 
      _id: { $in: doctorIds } 
    });
    
    // Create a map for easy access to user data
    const userMap = {};
    doctorUsers.forEach(u => {
      userMap[u._id.toString()] = u;
    });
    
    // Filter and score doctors based on various criteria
    doctors = doctors
      .map(doctor => {
        const user = userMap[doctor.userId.toString()];
        if (!user) return null;
        
        // Skip if gender preference doesn't match
        if (preferredGender !== 'no_preference' && 
            user.gender && 
            user.gender !== preferredGender) {
          return null;
        }
        
        // Skip if language requirements don't match
        const hasRequiredLanguage = languages.some(lang => 
          user.languages && user.languages.includes(lang)
        );
        
        if (!hasRequiredLanguage) {
          return null;
        }
        
        // Calculate a recommendation score
        let score = 0;
        
        // Score based on specialty match
        specialtiesArray.forEach(specialty => {
          if (doctor.specialties.includes(specialty)) {
            score += 10;
          }
        });
        
        // Score based on experience
        score += Math.min(doctor.experience || 0, 20) * 0.5;
        
        // Score based on ratings
        score += (doctor.ratings?.average || 0) * 2;
        
        // Higher score for doctors with more availability this week
        if (doctor.availability && doctor.availability.length > 0) {
          score += Math.min(doctor.availability.length, 7) * 0.5;
        }
        
        // Combine doctor and user data with score
        return {
          ...doctor.toObject(),
          firstName: user.firstName,
          lastName: user.lastName,
          gender: user.gender,
          languages: user.languages || [],
          avatarUrl: user.avatarUrl,
          recommendationScore: score
        };
      })
      .filter(Boolean) // Remove null entries
      .sort((a, b) => b.recommendationScore - a.recommendationScore) // Sort by score
      .slice(0, 10); // Return top matches
    
    // Return the recommended doctors along with the identified specialties
    res.json({
      recommendedDoctors: doctors,
      relevantSpecialties: Array.from(relevantSpecialties),
      symptomSpecialtyMap: symptoms.map(symptom => ({
        symptom,
        specialties: specialtyMap[symptom.toLowerCase()] || ['General Practitioner']
      }))
    });
  } catch (error) {
    console.error('Help Me Choose error:', error);
    res.status(500).json({ message: 'Server error processing recommendations' });
  }
});

router.get('/common-symptoms', async (req, res) => {
  try {
    // This would ideally come from a database, but for simplicity we're hard-coding
    const commonSymptoms = [
      'Headache',
      'Migraine',
      'Back Pain',
      'Chest Pain',
      'Abdominal Pain',
      'Cough',
      'Fever',
      'Rash',
      'Joint Pain',
      'Fatigue',
      'Depression',
      'Anxiety',
      'Shortness of Breath',
      'Dizziness',
      'Vision Problems',
      'Hearing Problems',
      'Skin Issues',
      'Digestive Problems',
      'Urinary Problems',
      'Sleep Problems',
      'Weight Changes',
      'Allergies'
    ];
    
    res.json({
      symptoms: commonSymptoms
    });
  } catch (error) {
    console.error('Common symptoms error:', error);
    res.status(500).json({ message: 'Server error fetching common symptoms' });
  }
});

module.exports = router;
