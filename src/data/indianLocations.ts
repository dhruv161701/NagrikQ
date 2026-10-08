// Complete Indian States & Cities/Districts Directory for NagrikQ Jurisdiction Mapping

export const INDIAN_STATES: string[] = [
  'Gujarat',
  'Maharashtra',
  'Karnataka',
  'Rajasthan',
  'Delhi',
  'Uttar Pradesh',
  'Madhya Pradesh',
  'Tamil Nadu',
  'Kerala',
  'Punjab',
  'Haryana',
  'West Bengal',
  'Andhra Pradesh',
  'Telangana',
  'Bihar',
  'Odisha',
  'Assam',
  'Goa',
  'Himachal Pradesh',
  'Uttarakhand',
  'Chhattisgarh',
  'Jharkhand',
  'Jammu & Kashmir',
  'Chandigarh',
  'Puducherry',
];

export const STATE_CITIES: Record<string, string[]> = {
  Gujarat: [
    'Rajkot',
    'Ahmedabad',
    'Surat',
    'Vadodara',
    'Gandhinagar',
    'Bhavnagar',
    'Jamnagar',
    'Junagadh',
    'Anand',
    'Navsari',
    'Morbi',
    'Bharuch',
    'Mehsana',
    'Porbandar',
    'Valsad',
    'Kutch (Bhuj)',
    'Patan',
    'Surendranagar',
    'Amreli',
  ],
  Maharashtra: [
    'Mumbai City',
    'Mumbai Suburban',
    'Pune',
    'Nagpur',
    'Nashik',
    'Thane',
    'Chhatrapati Sambhajinagar',
    'Solapur',
    'Kolhapur',
    'Amravati',
    'Navi Mumbai',
    'Satara',
    'Jalgaon',
    'Nanded',
  ],
  Karnataka: [
    'Bengaluru Urban',
    'Bengaluru Rural',
    'Mysuru',
    'Hubballi-Dharwad',
    'Mangaluru',
    'Belagavi',
    'Kalaburagi',
    'Ballari',
    'Davanagere',
    'Shivamogga',
    'Udupi',
  ],
  Rajasthan: [
    'Jaipur',
    'Jodhpur',
    'Kota',
    'Bikaner',
    'Ajmer',
    'Udaipur',
    'Bhilwara',
    'Alwar',
    'Sikar',
    'Bharatpur',
    'Pali',
  ],
  Delhi: [
    'New Delhi',
    'Central Delhi',
    'North Delhi',
    'South Delhi',
    'East Delhi',
    'West Delhi',
    'North East Delhi',
    'South West Delhi',
  ],
  'Uttar Pradesh': [
    'Lucknow',
    'Kanpur',
    'Varanasi',
    'Agra',
    'Prayagraj',
    'Meerut',
    'Noida (Gautam Buddha Nagar)',
    'Ghaziabad',
    'Bareilly',
    'Aligarh',
    'Gorakhpur',
    'Ayodhya',
  ],
  'Madhya Pradesh': [
    'Bhopal',
    'Indore',
    'Jabalpur',
    'Gwalior',
    'Ujjain',
    'Sagar',
    'Dewas',
    'Satna',
    'Ratlam',
  ],
  'Tamil Nadu': [
    'Chennai',
    'Coimbatore',
    'Madurai',
    'Tiruchirappalli',
    'Salem',
    'Tirunelveli',
    'Erode',
    'Vellore',
    'Thanjavur',
  ],
  Kerala: [
    'Thiruvananthapuram',
    'Kochi (Ernakulam)',
    'Kozhikode',
    'Thrissur',
    'Kollam',
    'Kannur',
    'Alappuzha',
    'Palakkad',
    'Kottayam',
  ],
  Punjab: [
    'Chandigarh',
    'Ludhiana',
    'Amritsar',
    'Jalandhar',
    'Patiala',
    'Bathinda',
    'Mohali (SAS Nagar)',
    'Hoshiarpur',
  ],
  Haryana: [
    'Gurugram',
    'Faridabad',
    'Panipat',
    'Ambala',
    'Yamunanagar',
    'Rohtak',
    'Hisar',
    'Karnal',
    'Panchkula',
  ],
  'West Bengal': [
    'Kolkata',
    'Howrah',
    'Durgapur',
    'Asansol',
    'Siliguri',
    'Bardhaman',
    'Kharagpur',
    'Darjeeling',
  ],
  'Andhra Pradesh': [
    'Visakhapatnam',
    'Vijayawada',
    'Guntur',
    'Nellore',
    'Kurnool',
    'Tirupati',
    'Kakinada',
  ],
  Telangana: [
    'Hyderabad',
    'Warangal',
    'Nizamabad',
    'Khammam',
    'Karimnagar',
    'Secunderabad',
  ],
  Bihar: [
    'Patna',
    'Gaya',
    'Bhagalpur',
    'Muzaffarpur',
    'Purnia',
    'Darbhanga',
    'Bihar Sharif',
  ],
  Odisha: [
    'Bhubaneswar',
    'Cuttack',
    'Rourkela',
    'Berhampur',
    'Sambalpur',
    'Puri',
  ],
  Assam: [
    'Guwahati',
    'Silchar',
    'Dibrugarh',
    'Jorhat',
    'Nagaon',
    'Tinsukia',
  ],
  Goa: [
    'Panaji (North Goa)',
    'Margao (South Goa)',
    'Vasco da Gama',
    'Mapusa',
    'Ponda',
  ],
  'Himachal Pradesh': [
    'Shimla',
    'Dharamshala',
    'Solan',
    'Mandi',
    'Kullu',
  ],
  Uttarakhand: [
    'Dehradun',
    'Haridwar',
    'Roorkee',
    'Haldwani',
    'Rudrapur',
    'Nainital',
  ],
  Chhattisgarh: [
    'Raipur',
    'Bhilai',
    'Bilaspur',
    'Korba',
    'Durg',
  ],
  Jharkhand: [
    'Ranchi',
    'Jamshedpur',
    'Dhanbad',
    'Bokaro',
    'Deoghar',
  ],
  'Jammu & Kashmir': [
    'Srinagar',
    'Jammu',
    'Anantnag',
    'Baramulla',
    'Kathua',
    'Udhampur',
  ],
  Chandigarh: ['Chandigarh (HQ)'],
  Puducherry: ['Puducherry City', 'Karaikal', 'Mahe', 'Yanam'],
};

// Document validity periods by service category or type
export const SERVICE_DOCUMENT_VALIDITY: Record<string, string> = {
  'Income Certificate': 'Valid for 3 Years',
  'Caste Certificate': 'Lifetime Validity',
  'Non-Creamy Layer (NCL) Certificate': 'Valid for 3 Years',
  'Economically Weaker Section (EWS)': 'Valid for 1 Financial Year',
  'Senior Citizen Identity Card': 'Lifetime Validity',
  'Domicile Certificate': 'Lifetime Validity',
  'Ration Card (NFSA / BPL / APL)': 'Valid for 5 Years',
  'Disability Certificate (UDID)': 'Valid for 5 Years (or Permanent)',
  'Birth Certificate': 'Lifetime Validity',
  'Death Certificate': 'Lifetime Validity',
  'Trade License': 'Valid for 1 Year (Annual Renewal)',
};

// Standard multi-counter sequences
export const DEFAULT_COUNTER_SEQUENCES: Record<string, string[]> = {
  Revenue: ['Counter 1 (Intake & Scan)', 'Counter 3 (Tehsildar Scrutiny)', 'Counter 5 (Official Seal & Dispatch)'],
  'Social Welfare': ['Counter 2 (Eligibility Check)', 'Counter 4 (Biometric Validation)', 'Counter 5 (Card Issuance)'],
  Transport: ['Counter 1 (Document Inspection)', 'Counter 2 (Biometrics & Photo)', 'Counter 6 (RTO Seal & Dispatch)'],
  'Civil Supplies': ['Counter 1 (Ration Records Check)', 'Counter 3 (Fair Price Allocation)', 'Counter 4 (Smart Card Print)'],
  Default: ['Counter 1 (Intake)', 'Counter 3 (Verification)', 'Counter 4 (Officer Approval & Stamp)'],
};

// State-specific document variations
export const STATE_SPECIFIC_REQUIREMENTS: Record<string, { docName: string; instructions: string }[]> = {
  Gujarat: [
    { docName: 'Talati / Mamlatdar Verified Income Assessment', instructions: 'Self-attested affidavit issued under Gujarat Land Revenue Rules' },
    { docName: 'Barcoded Gujarat Digital Ration Card', instructions: 'Digital NFSA / Non-NFSA ration card copy' },
  ],
  Maharashtra: [
    { docName: 'MahaDBT Tehsildar Income Verification', instructions: 'Signed by competent Tehsildar with digital barcode' },
    { docName: '7/12 Extract (Saat Baara) or 8A Certificate', instructions: 'Latest copy from Mahabhumi portal' },
  ],
  Karnataka: [
    { docName: 'Nadakacheri Atalji Janasnehi Kendra Certificate', instructions: 'RD Number signed by Revenue Inspector' },
    { docName: 'RTC (Pahani) Land Record Proof', instructions: 'Current year Bhoomi RTC record' },
  ],
  Delhi: [
    { docName: 'e-District Delhi Sub-Divisional Magistrate (SDM) Verification', instructions: 'Digitally signed SDM inspection document' },
  ],
  Rajasthan: [
    { docName: 'Jan Aadhaar Card (Mukhyamantri)', instructions: 'Family Jan Aadhaar registration receipt' },
  ],
  'Uttar Pradesh': [
    { docName: 'e-Sathi UP Lekhpal Income Inquiry Report', instructions: 'Verified report signed by local Lekhpal / Tehsildar' },
  ],
};

// Fixed 30-minute appointment slots for advance booking
export const FIXED_30_MIN_SLOTS: string[] = [
  '09:30 AM - 10:00 AM',
  '10:00 AM - 10:30 AM',
  '10:30 AM - 11:00 AM',
  '11:00 AM - 11:30 AM',
  '11:30 AM - 12:00 PM',
  '12:00 PM - 12:30 PM',
  '01:30 PM - 02:00 PM',
  '02:00 PM - 02:30 PM',
  '02:30 PM - 03:00 PM',
  '03:00 PM - 03:30 PM',
  '03:30 PM - 04:00 PM',
  '04:00 PM - 04:30 PM',
  '04:30 PM - 05:00 PM',
];

export interface BookingDateOption {
  date: string; // YYYY-MM-DD
  label: 'Today' | 'Tomorrow';
  formatted: string; // "Wed, 7 Oct"
  isToday: boolean;
}

// Strictly allow ONLY Today and Tomorrow for booking
export const getAvailableBookingDates = (): BookingDateOption[] => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const formatOptions: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };

  return [
    {
      date: todayStr,
      label: 'Today',
      formatted: now.toLocaleDateString('en-IN', formatOptions),
      isToday: true,
    },
    {
      date: tomorrowStr,
      label: 'Tomorrow',
      formatted: tomorrow.toLocaleDateString('en-IN', formatOptions),
      isToday: false,
    },
  ];
};

// Check if a 30-min slot's start time has already passed for Today
export const isSlotInPastForToday = (slot: string): boolean => {
  try {
    const parts = slot.split('-');
    if (parts.length < 1) return false;
    const startPart = parts[0].trim(); // e.g. "09:30 AM"
    const [time, period] = startPart.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const now = new Date();
    const slotStartTime = new Date();
    slotStartTime.setHours(hours, minutes, 0, 0);

    return now.getTime() >= slotStartTime.getTime();
  } catch {
    return false;
  }
};


