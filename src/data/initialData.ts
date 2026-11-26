import { Student, AttendanceRecord, TestScore, SubjectSyllabus, FeeRecord, StudentGroup } from '../types';

export const INITIAL_GROUPS: StudentGroup[] = [
  {
    id: 'grp-1',
    name: 'A-Levels Physics Alpha Batch',
    description: 'CAIE & Federal Board advanced physics batch covering vectors, mechanics, and nuclear physics.',
    grade: '12th / XII year / A2',
    subject: 'Physics (9702)',
    tuitionMode: 'online',
    timeSlot: '7:30 PM - 9:00 PM (Mon, Wed, Fri)',
    monthlyFeePerStudent: 25000,
    studentIds: ['std-1', 'std-4', 'std-5'],
    avatarBg: 'bg-indigo-600',
    meetingLinkOrLocation: 'https://meet.google.com/sap-phys-alpha',
    createdAt: '2026-01-15'
  },
  {
    id: 'grp-2',
    name: "O'Levels CAIE Stars Group",
    description: 'Targeted preparation for May/June CAIE series across Physics (5054) & Mathematics (4024).',
    grade: "O'levels Final",
    subject: 'Physics (5054) & Mathematics (4024)',
    tuitionMode: 'online',
    timeSlot: '6:00 PM - 7:15 PM (Tue, Thu, Sat)',
    monthlyFeePerStudent: 22000,
    studentIds: ['std-2', 'std-6'],
    avatarBg: 'bg-emerald-600',
    meetingLinkOrLocation: 'https://meet.google.com/sap-olevel-stars',
    createdAt: '2026-02-01'
  },
  {
    id: 'grp-3',
    name: 'Matric 10th Board Toppers Group',
    description: 'Comprehensive Punjab & Federal Board past papers and numerical derivations masterclass.',
    grade: '10th / X',
    subject: 'Mathematics & Physics',
    tuitionMode: 'home',
    timeSlot: '3:00 PM - 4:00 PM (Daily Mon-Fri)',
    monthlyFeePerStudent: 15000,
    studentIds: ['std-3'],
    avatarBg: 'bg-amber-600',
    meetingLinkOrLocation: 'DHA Phase 5 Study Room, Lahore',
    createdAt: '2026-03-01'
  }
];

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'std-1',
    rollNo: 'SAP-001',
    name: 'Hamza Tariq',
    phone: '+92 301 4589231',
    parentName: 'Tariq Mehmood',
    parentPhone: '+92 300 8765432',
    email: 'hamza.tariq@gmail.com',
    grade: '11th / XI year / AS / A1',
    board: 'Federal Board',
    tuitionMode: 'home',
    addressOrLocation: 'House 42, Street 8, Sector F-10/2, Islamabad',
    timeSlot: '4:00 PM - 5:30 PM (Mon, Wed, Fri)',
    subjects: ['Physics', 'Mathematics'],
    monthlyFee: 18000,
    feeDueDay: 5,
    joiningDate: '2026-03-01',
    avatarBg: 'bg-blue-600',
    notes: 'Preparing for NUST NET entry test. Needs extra practice on rotational mechanics and conic sections.',
    isActive: true
  },
  {
    id: 'std-2',
    rollNo: 'SAP-002',
    name: 'Ayesha Malik',
    phone: '+92 321 9876543',
    parentName: 'Dr. Asim Malik',
    parentPhone: '+92 322 1122334',
    email: 'ayesha.asim@gmail.com',
    grade: "O'levels Final",
    board: 'Cambridge - CAIE',
    tuitionMode: 'online',
    addressOrLocation: 'Google Meet (Batch Alpha-Online)',
    timeSlot: '6:00 PM - 7:15 PM (Tue, Thu, Sat)',
    subjects: ['Physics (5054)', 'Mathematics (4024)', 'Chemistry (5070)'],
    monthlyFee: 22000,
    feeDueDay: 10,
    joiningDate: '2026-02-15',
    avatarBg: 'bg-emerald-600',
    notes: 'Targeting straight A*s in May/June 2027 series. Very consistent in homework submissions.',
    isActive: true
  },
  {
    id: 'std-3',
    rollNo: 'SAP-003',
    name: 'Zainab Fatima',
    phone: '+92 333 5544332',
    parentName: 'Engr. Imran Qureshi',
    parentPhone: '+92 334 9988776',
    email: 'zainab.fatima@gmail.com',
    grade: '10th / X',
    board: 'Punjab Board',
    tuitionMode: 'home',
    addressOrLocation: 'Apartment 304, DHA Phase 5, Lahore',
    timeSlot: '3:00 PM - 4:00 PM (Daily Mon-Fri)',
    subjects: ['Mathematics', 'Physics'],
    monthlyFee: 15000,
    feeDueDay: 5,
    joiningDate: '2026-04-10',
    avatarBg: 'bg-purple-600',
    notes: 'Focus on Matric board past papers, theorem derivations, and numerical problem solving.',
    isActive: true
  },
  {
    id: 'std-4',
    rollNo: 'SAP-004',
    name: 'Muhammad Bilal',
    phone: '+92 345 6789012',
    parentName: 'Muhammad Arshad',
    parentPhone: '+92 346 1234567',
    email: 'bilal.arshad@outlook.com',
    grade: '12th / XII year / A2',
    board: 'Cambridge - CAIE',
    tuitionMode: 'online',
    addressOrLocation: 'Zoom Meeting ID: 882-901-443',
    timeSlot: '7:30 PM - 9:00 PM (Mon, Wed, Fri)',
    subjects: ['Physics (9702)', 'Mathematics (9709)'],
    monthlyFee: 25000,
    feeDueDay: 7,
    joiningDate: '2026-01-10',
    avatarBg: 'bg-amber-600',
    notes: 'Aiming for GIKI/FAST entrance exam alongside CAIE exams. Special focus on calculus and electromagnetism.',
    isActive: true
  },
  {
    id: 'std-5',
    rollNo: 'SAP-005',
    name: 'Syed Daniyal Ali',
    phone: '+92 312 3456789',
    parentName: 'Syed Shahid Ali',
    parentPhone: '+92 313 9876543',
    email: 'daniyal.ali@gmail.com',
    grade: '12th / XII year / A2',
    board: 'Federal Board',
    tuitionMode: 'home',
    addressOrLocation: 'Villa 12, Bahria Town Phase 7, Rawalpindi',
    timeSlot: '5:30 PM - 7:00 PM (Mon, Wed, Fri)',
    subjects: ['Physics', 'Chemistry'],
    monthlyFee: 19000,
    feeDueDay: 5,
    joiningDate: '2026-05-01',
    avatarBg: 'bg-rose-600',
    notes: 'MDCAT preparation focused. Organic chemistry reactions & Physics modern physics chapters.',
    isActive: true
  },
  {
    id: 'std-6',
    rollNo: 'SAP-006',
    name: 'Sarah Khan',
    phone: '+92 302 7766554',
    parentName: 'Kamran Khan',
    parentPhone: '+92 300 3344556',
    email: 'sarah.k@gmail.com',
    grade: '9th / IX',
    board: 'Federal Board',
    tuitionMode: 'online',
    addressOrLocation: 'Zoom Online Classroom (Matric 9th)',
    timeSlot: '4:30 PM - 5:30 PM (Tue, Thu, Sat)',
    subjects: ['Mathematics', 'Physics', 'Chemistry'],
    monthlyFee: 14000,
    feeDueDay: 10,
    joiningDate: '2026-06-15',
    avatarBg: 'bg-teal-600',
    notes: 'Building strong foundations in algebraic equations, matrices, and Newton laws.',
    isActive: true
  }
];

export const INITIAL_SYLLABUS: SubjectSyllabus[] = [
  // ==========================================
  // CAMBRIDGE O-LEVEL (CAIE 5054, 4024, 5070)
  // ==========================================
  {
    id: 'syl-phy-olevel',
    subject: 'Physics (5054)',
    grade: "O Level (Cambridge - CAIE)",
    chapters: [
      {
        id: 'ch-ol-p1',
        chapterNumber: '1',
        title: 'Motion, Forces & Energy',
        topics: [
          { id: 'top-ol-p1-1', title: 'Physical Quantities & Measurement Techniques', status: 'completed', completedDate: '2026-03-05', notes: 'Micrometer & vernier calipers mastered' },
          { id: 'top-ol-p1-2', title: 'Speed, Velocity & Acceleration (Motion Graphs)', status: 'completed', completedDate: '2026-03-18', notes: 'Area under v-t graph and gradient calculations' },
          { id: 'top-ol-p1-3', title: 'Mass, Weight & Density', status: 'completed', completedDate: '2026-03-28', notes: 'Displacement can experiment practice' },
          { id: 'top-ol-p1-4', title: 'Newton’s Laws of Motion & Friction', status: 'completed', completedDate: '2026-04-12', notes: 'Resultant force F=ma solved' },
          { id: 'top-ol-p1-5', title: 'Deformation, Hooke’s Law & Limit of Proportionality', status: 'completed', completedDate: '2026-04-25', notes: 'Spring constant k=F/x problems' },
          { id: 'top-ol-p1-6', title: 'Pressure, Hydrostatic Pressure & Hydraulic Systems', status: 'in-progress', notes: 'P=rho*g*h numericals underway' },
          { id: 'top-ol-p1-7', title: 'Work, Kinetic Energy, Potential Energy & Power', status: 'pending', notes: 'Next week target' }
        ]
      },
      {
        id: 'ch-ol-p2',
        chapterNumber: '2',
        title: 'Thermal Physics',
        topics: [
          { id: 'top-ol-p2-1', title: 'Kinetic Particle Model of Matter (Solids, Liquids, Gases)', status: 'pending', notes: 'Brownian motion & molecular structure' },
          { id: 'top-ol-p2-2', title: 'Thermal Expansion & Liquid-in-Glass Thermometers', status: 'pending', notes: 'Sensitivity, range, linearity' },
          { id: 'top-ol-p2-3', title: 'Specific Heat Capacity & Latent Heat of Fusion/Vaporization', status: 'pending', notes: 'Thermal calculations Q=mcDT' },
          { id: 'top-ol-p2-4', title: 'Conduction, Convection & Radiation (Vacuum Flask)', status: 'pending', notes: 'Emitter vs absorber of IR' }
        ]
      },
      {
        id: 'ch-ol-p3',
        chapterNumber: '3',
        title: 'Waves & Optics',
        topics: [
          { id: 'top-ol-p3-1', title: 'General Properties of Waves (Transverse vs Longitudinal)', status: 'pending', notes: 'v=f*lambda wave equation' },
          { id: 'top-ol-p3-2', title: 'Light Reflection, Refraction & Snell’s Law (n=sin i/sin r)', status: 'pending', notes: 'Critical angle & total internal reflection' },
          { id: 'top-ol-p3-3', title: 'Converging Lenses & Ray Diagrams', status: 'pending', notes: 'Magnifying glass & camera images' },
          { id: 'top-ol-p3-4', title: 'Electromagnetic Spectrum (Gamma to Radio Waves)', status: 'pending', notes: 'Uses & dangers of EM radiation' },
          { id: 'top-ol-p3-5', title: 'Sound Waves, Speed of Sound, Echoes & Ultrasound', status: 'pending', notes: 'Audible frequency range 20Hz-20kHz' }
        ]
      },
      {
        id: 'ch-ol-p4',
        chapterNumber: '4',
        title: 'Electricity & Magnetism',
        topics: [
          { id: 'top-ol-p4-1', title: 'Simple Magnetism & Magnetic Fields', status: 'pending', notes: 'Permanent magnets vs electromagnets' },
          { id: 'top-ol-p4-2', title: 'Electrostatic Charge, Induction & Electric Field Patterns', status: 'pending', notes: 'Conductors vs insulators' },
          { id: 'top-ol-p4-3', title: 'Current, Electromotive Force & Potential Difference', status: 'pending', notes: 'Ammeters in series, voltmeters in parallel' },
          { id: 'top-ol-p4-4', title: 'Resistance, Ohm’s Law & I-V Characteristic Graphs', status: 'pending', notes: 'Filament lamp, diode, thermistor, LDR' },
          { id: 'top-ol-p4-5', title: 'Series & Parallel Circuits (Current & Potential Divider Rules)', status: 'pending', notes: 'Kirchhoff’s basic current and voltage rules' },
          { id: 'top-ol-p4-6', title: 'Electromagnetic Effects (Motor Effect & Fleming’s Left Hand Rule)', status: 'pending', notes: 'DC motor & AC generator principles' }
        ]
      },
      {
        id: 'ch-ol-p5',
        chapterNumber: '5',
        title: 'Nuclear Physics & Radioactivity',
        topics: [
          { id: 'top-ol-p5-1', title: 'Atomic Structure, Nucleus, Protons, Neutrons & Isotopes', status: 'pending', notes: 'Nuclide notation' },
          { id: 'top-ol-p5-2', title: 'Alpha, Beta & Gamma Radiations (Ionization & Penetration)', status: 'pending', notes: 'Deflection in electric and magnetic fields' },
          { id: 'top-ol-p5-3', title: 'Radioactive Decay Equations & Half-Life Calculations', status: 'pending', notes: 'Background radiation and carbon dating' }
        ]
      }
    ]
  },
  {
    id: 'syl-math-olevel',
    subject: 'Mathematics (4024)',
    grade: "O Level (Cambridge - CAIE)",
    chapters: [
      {
        id: 'ch-ol-m1',
        chapterNumber: '1',
        title: 'Number & Arithmetic Operations',
        topics: [
          { id: 'top-ol-m1-1', title: 'Primes, Factors, Multiples, HCF & LCM', status: 'completed', completedDate: '2026-02-28', notes: 'Prime factorization method' },
          { id: 'top-ol-m1-2', title: 'Percentages, Profit/Loss, Simple & Compound Interest', status: 'completed', completedDate: '2026-03-15', notes: 'Paper 1 & Paper 2 past questions done' },
          { id: 'top-ol-m1-3', title: 'Ratio, Proportion & Speed/Distance/Time Graphs', status: 'completed', completedDate: '2026-03-25', notes: 'Area under travel graph mastery' },
          { id: 'top-ol-m1-4', title: 'Standard Form, Estimation & Upper/Lower Bounds', status: 'completed', completedDate: '2026-04-05', notes: 'Error bounds in calculations' }
        ]
      },
      {
        id: 'ch-ol-m2',
        chapterNumber: '2',
        title: 'Algebra & Coordinate Geometry',
        topics: [
          { id: 'top-ol-m2-1', title: 'Simultaneous Linear & Non-Linear Equations', status: 'completed', completedDate: '2026-04-18', notes: 'Substitution & elimination mastered' },
          { id: 'top-ol-m2-2', title: 'Quadratic Equations (Formula, Completing Square & Factoring)', status: 'completed', completedDate: '2026-05-02', notes: 'Discriminant and curve sketching' },
          { id: 'top-ol-m2-3', title: 'Inequalities & Linear Programming (Shaded Regions)', status: 'in-progress', notes: 'Feasible region vertices practice' },
          { id: 'top-ol-m2-4', title: 'Coordinate Geometry (Gradients, Midpoints, Perpendicular Lines)', status: 'in-progress', notes: 'Equation of straight lines y=mx+c' }
        ]
      },
      {
        id: 'ch-ol-m3',
        chapterNumber: '3',
        title: 'Geometry and Trigonometry',
        topics: [
          { id: 'top-ol-m3-1', title: 'Circle Theorems & Geometric Angle Properties', status: 'pending', notes: 'Angles subtended by arc & cyclic quadrilaterals' },
          { id: 'top-ol-m3-2', title: 'Pythagoras Theorem & Trigonometric Ratios (SOH CAH TOA)', status: 'pending', notes: 'Right angled triangles' },
          { id: 'top-ol-m3-3', title: 'Sine Rule, Cosine Rule & Area of Triangle (1/2 ab sin C)', status: 'pending', notes: 'Non-right angled triangles & bearings' },
          { id: 'top-ol-m3-4', title: '3D Trigonometry & Angles of Elevation / Depression', status: 'pending', notes: '3D past paper problems' }
        ]
      },
      {
        id: 'ch-ol-m4',
        chapterNumber: '4',
        title: 'Vectors, Transformations & Matrices',
        topics: [
          { id: 'top-ol-m4-1', title: 'Column Vectors, Magnitude & Vector Geometry', status: 'pending', notes: 'Collinear points & ratio proofs' },
          { id: 'top-ol-m4-2', title: 'Transformations (Translation, Reflection, Rotation, Enlargement)', status: 'pending', notes: 'Negative & fractional scale factors' }
        ]
      },
      {
        id: 'ch-ol-m5',
        chapterNumber: '5',
        title: 'Statistics & Probability',
        topics: [
          { id: 'top-ol-m5-1', title: 'Mean, Median, Mode & Cumulative Frequency Curves', status: 'pending', notes: 'Interquartile range & box-and-whisker plots' },
          { id: 'top-ol-m5-2', title: 'Probability (Tree Diagrams, With & Without Replacement)', status: 'pending', notes: 'Venn diagrams and set notation' }
        ]
      }
    ]
  },
  {
    id: 'syl-chem-olevel',
    subject: 'Chemistry (5070)',
    grade: "O Level (Cambridge - CAIE)",
    chapters: [
      {
        id: 'ch-ol-c1',
        chapterNumber: '1',
        title: 'States of Matter & Experimental Chemistry',
        topics: [
          { id: 'top-ol-c1-1', title: 'Kinetic Particle Theory & Diffusion', status: 'completed', completedDate: '2026-03-10', notes: 'Heating/cooling curves' },
          { id: 'top-ol-c1-2', title: 'Apparatus, Measurement & Gas Collection Methods', status: 'completed', completedDate: '2026-03-22', notes: 'Downward delivery vs upward delivery' },
          { id: 'top-ol-c1-3', title: 'Purification Techniques & Chromatography (Rf values)', status: 'completed', completedDate: '2026-04-08', notes: 'Fractional distillation & crystallization' }
        ]
      },
      {
        id: 'ch-ol-c2',
        chapterNumber: '2',
        title: 'Atoms, Bonding & Stoichiometry (Mole Concept)',
        topics: [
          { id: 'top-ol-c2-1', title: 'Atomic Structure, Isotopes & Electronic Configurations', status: 'completed', completedDate: '2026-04-20', notes: 'Valency electrons & periodic table groups' },
          { id: 'top-ol-c2-2', title: 'Ionic, Covalent & Metallic Bonding (Dot-and-Cross Diagrams)', status: 'in-progress', notes: 'Giant vs simple molecular structures' },
          { id: 'top-ol-c2-3', title: 'Mole Concept, Molar Mass, Avogadro Constant & Gas Volumes', status: 'pending', notes: 'Concentration mol/dm3 calculations' },
          { id: 'top-ol-c2-4', title: 'Empirical & Molecular Formulas, Limiting Reactants & Yields', status: 'pending', notes: 'Percentage purity & percentage yield' }
        ]
      },
      {
        id: 'ch-ol-c3',
        chapterNumber: '3',
        title: 'Acids, Bases, Salts & Chemical Reactions',
        topics: [
          { id: 'top-ol-c3-1', title: 'Acids, Bases, pH Scale & Indicators', status: 'pending', notes: 'Strong vs weak acids' },
          { id: 'top-ol-c3-2', title: 'Preparation of Soluble & Insoluble Salts (Titration & Precipitation)', status: 'pending', notes: 'Precipitation reactions' },
          { id: 'top-ol-c3-3', title: 'Redox Reactions & Oxidation Numbers', status: 'pending', notes: 'Oxidizing & reducing agents (KMnO4 / KI)' },
          { id: 'top-ol-c3-4', title: 'Rates of Reaction & Catalyst Activation Energy', status: 'pending', notes: 'Collision theory & Maxwell-Boltzmann' }
        ]
      },
      {
        id: 'ch-ol-c4',
        chapterNumber: '4',
        title: 'Organic Chemistry',
        topics: [
          { id: 'top-ol-c4-1', title: 'Homologous Series, Functional Groups & Naming (IUPAC)', status: 'pending', notes: 'Alkanes, alkenes, alcohols, carboxylic acids' },
          { id: 'top-ol-c4-2', title: 'Alkanes (Combustion & Free Radical Substitution)', status: 'pending', notes: 'Cracking of petroleum fractions' },
          { id: 'top-ol-c4-3', title: 'Alkenes (Addition Reactions: Bromine, Hydrogen, Steam)', status: 'pending', notes: 'Test for unsaturation' },
          { id: 'top-ol-c4-4', title: 'Addition & Condensation Polymers (Nylon, Terylene, Plastics)', status: 'pending', notes: 'Ester linkages & amide linkages' }
        ]
      }
    ]
  },

  // ==========================================
  // CAMBRIDGE A-LEVEL (CAIE 9702, 9709)
  // ==========================================
  {
    id: 'syl-phy-alevel',
    subject: 'Physics (9702)',
    grade: "AS & A Level (Cambridge - CAIE)",
    chapters: [
      {
        id: 'ch-al-p1',
        chapterNumber: '1',
        title: 'Physical Quantities, Kinematics & Dynamics (AS)',
        topics: [
          { id: 'top-al-p1-1', title: 'Physical Quantities, SI Base Units & Errors/Uncertainties', status: 'completed', completedDate: '2026-02-20', notes: 'Percentage uncertainty propagation' },
          { id: 'top-al-p1-2', title: 'Vectors Resolution & Equilibrium of Forces', status: 'completed', completedDate: '2026-03-02', notes: 'Triangle of forces & coplanar vectors' },
          { id: 'top-al-p1-3', title: 'Kinematics Equations & 2D Projectile Motion', status: 'completed', completedDate: '2026-03-18', notes: 'Trajectory equations' },
          { id: 'top-al-p1-4', title: 'Newton’s Laws, Momentum & 2D Elastic Collisions', status: 'completed', completedDate: '2026-04-05', notes: 'Impulse and conservation of momentum' }
        ]
      },
      {
        id: 'ch-al-p2',
        chapterNumber: '2',
        title: 'Forces, Density, Pressure & Energy (AS)',
        topics: [
          { id: 'top-al-p2-1', title: 'Turning Effects, Moments & Couples', status: 'completed', completedDate: '2026-04-22', notes: 'Principle of moments' },
          { id: 'top-al-p2-2', title: 'Hydrostatic Pressure & Upthrust (Archimedes Principle)', status: 'completed', completedDate: '2026-05-08', notes: 'Derivation of Delta P = rho g Delta h' },
          { id: 'top-al-p2-3', title: 'Work Done, Kinetic Energy, Potential Energy & Power', status: 'in-progress', notes: 'Efficiency calculations' },
          { id: 'top-al-p2-4', title: 'Deformation of Solids, Stress, Strain & Young Modulus', status: 'in-progress', notes: 'Stress-strain curves & strain energy' }
        ]
      },
      {
        id: 'ch-al-p3',
        chapterNumber: '3',
        title: 'Waves, Superposition & Electricity (AS)',
        topics: [
          { id: 'top-al-p3-1', title: 'Progressive Waves, Transverse/Longitudinal & Doppler Effect', status: 'pending', notes: 'Observed frequency formula' },
          { id: 'top-al-p3-2', title: 'Two-Source Interference & Young’s Double Slit Experiment', status: 'pending', notes: 'lambda = ax/D derivation' },
          { id: 'top-al-p3-3', title: 'Diffraction Gratings (d sin theta = n lambda)', status: 'pending', notes: 'Maximum orders calculation' },
          { id: 'top-al-p3-4', title: 'Stationary Waves (Nodes, Antinodes & Harmonics in Strings/Pipes)', status: 'pending', notes: 'Standing wave patterns' },
          { id: 'top-al-p3-5', title: 'Kirchhoff’s Laws & Potential Divider Circuits (Potentiometer)', status: 'pending', notes: 'Null method comparison of e.m.f.' }
        ]
      },
      {
        id: 'ch-al-p4',
        chapterNumber: '4',
        title: 'Circular Motion, Gravitation & Oscillations (A2)',
        topics: [
          { id: 'top-al-p4-1', title: 'Kinematics of Uniform Circular Motion (Radians & Centripetal Acceleration)', status: 'pending', notes: 'a = v^2/r = omega^2 r' },
          { id: 'top-al-p4-2', title: 'Gravitational Fields, Newton’s Law & Gravitational Potential (Phi = -GM/r)', status: 'pending', notes: 'Geostationary orbital mechanics' },
          { id: 'top-al-p4-3', title: 'Simple Harmonic Motion (SHM Equations, Velocity & Energy in SHM)', status: 'pending', notes: 'a = -omega^2 x' },
          { id: 'top-al-p4-4', title: 'Damped & Forced Oscillations, Resonance & Q-Factor', status: 'pending', notes: 'Critical damping applications' }
        ]
      },
      {
        id: 'ch-al-p5',
        chapterNumber: '5',
        title: 'Fields, Capacitance, Quantum & Nuclear Physics (A2)',
        topics: [
          { id: 'top-al-p5-1', title: 'Electric Fields, Coulomb’s Law & Electric Potential', status: 'pending', notes: 'Uniform field between parallel plates' },
          { id: 'top-al-p5-2', title: 'Capacitors, Energy Stored & Exponential Discharge Circuits', status: 'pending', notes: 'Time constant tau = RC' },
          { id: 'top-al-p5-3', title: 'Magnetic Fields, Force on Current & Magnetic Flux Density', status: 'pending', notes: 'Hall effect & Hall voltage derivation' },
          { id: 'top-al-p5-4', title: 'Electromagnetic Induction, Faraday’s & Lenz’s Laws', status: 'pending', notes: 'E = -dPhi/dt' },
          { id: 'top-al-p5-5', title: 'Photoelectric Effect, Wave-Particle Duality & de Broglie Wavelength', status: 'pending', notes: 'hf = Phi + 1/2 mv^2 max' }
        ]
      }
    ]
  },
  {
    id: 'syl-math-alevel',
    subject: 'Mathematics (9709)',
    grade: "AS & A Level (Cambridge - CAIE)",
    chapters: [
      {
        id: 'ch-al-m1',
        chapterNumber: '1',
        title: 'Pure Mathematics 1 (P1)',
        topics: [
          { id: 'top-al-m1-1', title: 'Quadratics (Completing the Square, Discriminant, Simultaneous)', status: 'completed', completedDate: '2026-03-10', notes: 'Vertex and roots' },
          { id: 'top-al-m1-2', title: 'Functions, Domain/Range & Inverse/Composite Functions', status: 'completed', completedDate: '2026-03-24', notes: 'One-one condition for inverse' },
          { id: 'top-al-m1-3', title: 'Coordinate Geometry (Perpendicular Bisectors & Circles)', status: 'completed', completedDate: '2026-04-15', notes: 'Circle equation (x-a)^2+(y-b)^2=r^2' },
          { id: 'top-al-m1-4', title: 'Circular Measure (Arc Length s=r theta & Sector Area 1/2 r^2 theta)', status: 'completed', completedDate: '2026-05-01', notes: 'Radian calculations' },
          { id: 'top-al-m1-5', title: 'Trigonometry (Identities, Graphs & Equations)', status: 'in-progress', notes: 'tan=sin/cos, sin^2+cos^2=1' },
          { id: 'top-al-m1-6', title: 'Differentiation & Applications (Stationary Points, Rates of Change)', status: 'in-progress', notes: 'Second derivative tests' },
          { id: 'top-al-m1-7', title: 'Integration & Definite Integrals (Area Under Curve & Volume of Revolution)', status: 'pending', notes: 'Integration techniques' }
        ]
      },
      {
        id: 'ch-al-m2',
        chapterNumber: '2',
        title: 'Mechanics (M1)',
        topics: [
          { id: 'top-al-m2-1', title: 'Forces & Equilibrium (Resolving Forces & Friction F <= mu R)', status: 'pending', notes: 'Coplanar equilibrium' },
          { id: 'top-al-m2-2', title: 'Kinematics in a Straight Line (Constant & Variable Acceleration)', status: 'pending', notes: 'v=u+at equations and calculus' },
          { id: 'top-al-m2-3', title: 'Newton’s Laws of Motion & Connected Particles (Pulleys, Inclined Planes)', status: 'pending', notes: 'Tension and acceleration equations' },
          { id: 'top-al-m2-4', title: 'Work, Energy & Power (Work-Energy Principle & P=Fv)', status: 'pending', notes: 'Conservation of mechanical energy' }
        ]
      },
      {
        id: 'ch-al-m3',
        chapterNumber: '3',
        title: 'Probability & Statistics 1 (S1)',
        topics: [
          { id: 'top-al-m3-1', title: 'Representation of Data (Stem-and-Leaf, Box Plots, Histograms)', status: 'pending', notes: 'Cumulative frequency' },
          { id: 'top-al-m3-2', title: 'Permutations & Combinations (Arrangements & Selections)', status: 'pending', notes: 'nPr and nCr applications' },
          { id: 'top-al-m3-3', title: 'Discrete Random Variables, Probability Distributions & Binomial Distribution', status: 'pending', notes: 'E(X) and Var(X)' },
          { id: 'top-al-m3-4', title: 'The Normal Distribution & Standardizing Z = (X-mu)/sigma', status: 'pending', notes: 'Finding parameters mu and sigma' }
        ]
      }
    ]
  },

  // ==========================================
  // F.SC (INTERMEDIATE / FEDERAL & PUNJAB BOARDS)
  // ==========================================
  {
    id: 'syl-phy-fsc1',
    subject: 'Physics',
    grade: 'F.Sc Part 1 (Pre-Engineering / Medical)',
    chapters: [
      {
        id: 'ch-fsc-1',
        chapterNumber: '1',
        title: 'Measurements & Physical Quantities',
        topics: [
          { id: 'top-f1-1', title: 'SI Base & Derived Units, Unit Prefixes', status: 'completed', completedDate: '2026-03-08', notes: 'Mastered dimensions' },
          { id: 'top-f1-2', title: 'Significant Figures & Precision vs Accuracy', status: 'completed', completedDate: '2026-03-12', notes: 'Done numericals' },
          { id: 'top-f1-3', title: 'Dimensional Analysis & Homogeneity of Equations', status: 'completed', completedDate: '2026-03-16', notes: 'All derivations covered' }
        ]
      },
      {
        id: 'ch-fsc-2',
        chapterNumber: '2',
        title: 'Vectors and Equilibrium',
        topics: [
          { id: 'top-f2-1', title: 'Vector Addition by Rectangular Components', status: 'completed', completedDate: '2026-03-24', notes: 'Solved 15 textbook problems' },
          { id: 'top-f2-2', title: 'Scalar (Dot) and Vector (Cross) Products', status: 'completed', completedDate: '2026-04-02', notes: 'Geometric interpretations explained' },
          { id: 'top-f2-3', title: 'Torque, Couple & First & Second Conditions of Equilibrium', status: 'completed', completedDate: '2026-04-10', notes: 'Ladder & rod balance problems solved' }
        ]
      },
      {
        id: 'ch-fsc-3',
        chapterNumber: '3',
        title: 'Motion and Force',
        topics: [
          { id: 'top-f3-1', title: 'Newton’s Laws of Motion & Momentum', status: 'completed', completedDate: '2026-04-20', notes: 'Impulse graph analysis done' },
          { id: 'top-f3-2', title: 'Elastic and Inelastic Collisions in 1D & 2D', status: 'completed', completedDate: '2026-05-04', notes: 'Derivation for relative velocities done' },
          { id: 'top-f3-3', title: 'Projectile Motion (Trajectory, Max Height, Time of Flight, Range)', status: 'revised', completedDate: '2026-05-18', notes: 'Very important for board and NET exams' },
          { id: 'top-f3-4', title: 'Rocket Propulsion & Terminal Velocity in Viscous Media', status: 'completed', completedDate: '2026-05-25', notes: 'Stokes law explained' }
        ]
      },
      {
        id: 'ch-fsc-4',
        chapterNumber: '4',
        title: 'Work and Energy',
        topics: [
          { id: 'top-f4-1', title: 'Work done by Constant & Variable Force', status: 'completed', completedDate: '2026-06-08', notes: 'Area under F-d curve solved' },
          { id: 'top-f4-2', title: 'Work-Energy Theorem & Gravitational Potential Energy', status: 'completed', completedDate: '2026-06-15', notes: 'Conservative field proof' },
          { id: 'top-f4-3', title: 'Escape Velocity & Absolute Potential Energy', status: 'in-progress', notes: 'Derivation ongoing' },
          { id: 'top-f4-4', title: 'Non-Conventional Energy Sources & Efficiency', status: 'pending', notes: 'Scheduled for next week' }
        ]
      },
      {
        id: 'ch-fsc-5',
        chapterNumber: '5',
        title: 'Rotational and Circular Motion',
        topics: [
          { id: 'top-f5-1', title: 'Angular Displacement, Velocity & Acceleration', status: 'pending', notes: 'Upcoming' },
          { id: 'top-f5-2', title: 'Centripetal Force & Centripetal Acceleration', status: 'pending', notes: 'Upcoming' },
          { id: 'top-f5-3', title: 'Moment of Inertia & Angular Momentum Conservation', status: 'pending', notes: 'Upcoming' },
          { id: 'top-f5-4', title: 'Geostationary Orbits & Artificial Gravity', status: 'pending', notes: 'Upcoming' }
        ]
      }
    ]
  },
  {
    id: 'syl-chem-fsc',
    subject: 'Chemistry',
    grade: 'F.Sc / Federal Board',
    chapters: [
      {
        id: 'ch-c1',
        chapterNumber: '1',
        title: 'Basic Concepts & Stoichiometry',
        topics: [
          { id: 'top-c1-1', title: 'Mole Concept, Avogadro Number & Molar Volume', status: 'revised', completedDate: '2026-03-20', notes: 'Numericals completed' },
          { id: 'top-c1-2', title: 'Limiting Reactant & Theoretical vs Actual Yield', status: 'completed', completedDate: '2026-04-05', notes: 'Mastered' }
        ]
      },
      {
        id: 'ch-c2',
        chapterNumber: '2',
        title: 'Atomic Structure & Quantum Numbers',
        topics: [
          { id: 'top-c2-1', title: 'Bohr Atomic Model, Hydrogen Spectrum & Quantum Numbers', status: 'completed', completedDate: '2026-05-10', notes: 'Electronic configuration rules' },
          { id: 'top-c2-2', title: 'Heisenberg Uncertainty Principle & Shapes of Orbitals', status: 'in-progress', notes: 'Orbital hybridization underway' }
        ]
      }
    ]
  },

  // ==========================================
  // MATRICULATION (CLASS 9 & 10 / PUNJAB & FEDERAL BOARDS)
  // ==========================================
  {
    id: 'syl-math-matric',
    subject: 'Mathematics',
    grade: 'Matric (Class 9 & 10 / Punjab & Federal Board)',
    chapters: [
      {
        id: 'ch-mat-1',
        chapterNumber: '1',
        title: 'Matrices and Determinants',
        topics: [
          { id: 'top-mat-1-1', title: 'Introduction to Matrices, Order & Types of Matrices', status: 'completed', completedDate: '2026-03-01', notes: 'Row, column, square matrices' },
          { id: 'top-mat-1-2', title: 'Determinant of 2x2 Matrix & Adjoint of Matrix', status: 'completed', completedDate: '2026-03-14', notes: 'Singular and non-singular matrices' },
          { id: 'top-mat-1-3', title: 'Matrix Inversion Method & Cramer’s Rule', status: 'completed', completedDate: '2026-03-28', notes: 'Linear system word problems solved' }
        ]
      },
      {
        id: 'ch-mat-2',
        chapterNumber: '2',
        title: 'Real & Complex Numbers and Logarithms',
        topics: [
          { id: 'top-mat-2-1', title: 'Radicals, Radicands & Laws of Exponents', status: 'completed', completedDate: '2026-04-10', notes: 'Simplification questions' },
          { id: 'top-mat-2-2', title: 'Complex Numbers & Algebraic Operations (a + bi)', status: 'completed', completedDate: '2026-04-24', notes: 'Conjugate and modulus' },
          { id: 'top-mat-2-3', title: 'Scientific Notation & Laws of Logarithms (Log Tables)', status: 'in-progress', notes: 'Characteristic and mantissa' }
        ]
      },
      {
        id: 'ch-mat-3',
        chapterNumber: '3',
        title: 'Quadratic Equations & Variations (Class 10)',
        topics: [
          { id: 'top-mat-3-1', title: 'Quadratic Equation Solution Methods (Factorization, Completing Square, Formula)', status: 'pending', notes: 'Standard form ax^2+bx+c=0' },
          { id: 'top-mat-3-2', title: 'Theory of Quadratic Equations & Nature of Roots (Discriminant)', status: 'pending', notes: 'Sum & product of roots' },
          { id: 'top-mat-3-3', title: 'Direct & Inverse Variations and Joint Variations', status: 'pending', notes: 'Theorem on proportions (componendo-dividendo)' }
        ]
      }
    ]
  }
];

export const INITIAL_TEST_SCORES: TestScore[] = [
  {
    id: 'test-1',
    studentId: 'std-1',
    subject: 'Physics',
    testTitle: 'Chapter 1 & 2: Vectors, Dimensions & Equilibrium',
    testDate: '2026-04-15',
    maxMarks: 50,
    obtainedMarks: 46,
    percentage: 92,
    grade: 'A*',
    remarks: 'Exceptional grip on rectangular component resolution and torque conditions.'
  },
  {
    id: 'test-2',
    studentId: 'std-1',
    subject: 'Mathematics',
    testTitle: 'Matrices, Determinants & Quadratic Equations',
    testDate: '2026-05-02',
    maxMarks: 75,
    obtainedMarks: 68,
    percentage: 90.7,
    grade: 'A*',
    remarks: 'Cramer rule and matrix inversion solved accurately. Minor calculation slip in sign.'
  },
  {
    id: 'test-3',
    studentId: 'std-1',
    subject: 'Physics',
    testTitle: 'Chapter 3: Projectile Motion & Momentum',
    testDate: '2026-06-10',
    maxMarks: 50,
    obtainedMarks: 44,
    percentage: 88,
    grade: 'A',
    remarks: 'Good understanding of ballistic trajectories; practice 2D elastic collision equations.'
  },
  {
    id: 'test-4',
    studentId: 'std-2',
    subject: 'Physics (5054)',
    testTitle: 'Kinematics, Dynamics & Pressure Test',
    testDate: '2026-04-20',
    maxMarks: 40,
    obtainedMarks: 38,
    percentage: 95,
    grade: 'A*',
    remarks: 'Superb Paper 2 structured answers and unit notations.'
  },
  {
    id: 'test-5',
    studentId: 'std-2',
    subject: 'Mathematics (4024)',
    testTitle: 'Algebraic Manipulation & Indices / Surds',
    testDate: '2026-05-18',
    maxMarks: 60,
    obtainedMarks: 57,
    percentage: 95,
    grade: 'A*',
    remarks: 'Flawless working steps shown. Ready for past paper mocks.'
  },
  {
    id: 'test-6',
    studentId: 'std-3',
    subject: 'Mathematics',
    testTitle: 'Chapter 1 & 2: Quadratic Equations & Theory',
    testDate: '2026-05-25',
    maxMarks: 50,
    obtainedMarks: 42,
    percentage: 84,
    grade: 'A',
    remarks: 'Good performance. Need more practice on discriminant conditions (nature of roots).'
  },
  {
    id: 'test-7',
    studentId: 'std-4',
    subject: 'Physics (9702)',
    testTitle: 'A2 Physics: Circular Motion & Gravitation Fields',
    testDate: '2026-06-02',
    maxMarks: 60,
    obtainedMarks: 52,
    percentage: 86.7,
    grade: 'A',
    remarks: 'Gravitational potential gradient and geostationary orbit calculations well written.'
  },
  {
    id: 'test-8',
    studentId: 'std-5',
    subject: 'Chemistry',
    testTitle: 'Stoichiometry & Atomic Structure Quiz',
    testDate: '2026-06-20',
    maxMarks: 45,
    obtainedMarks: 39,
    percentage: 86.7,
    grade: 'A',
    remarks: 'MDCAT MCQ speed is improving significantly.'
  }
];

// Dynamic relative date helpers for initial sample data
const getSampleRelDate = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  // Today's date and recent dates
  { id: 'att-1', date: getSampleRelDate(0), studentId: 'std-1', status: 'present', topicCovered: 'Work done by variable force & numericals' },
  { id: 'att-2', date: getSampleRelDate(0), studentId: 'std-2', status: 'present', topicCovered: 'Linear inequalities & region graphs' },
  { id: 'att-3', date: getSampleRelDate(0), studentId: 'std-3', status: 'present', topicCovered: 'Matrices word problems and theorem 1' },
  { id: 'att-4', date: getSampleRelDate(0), studentId: 'std-4', status: 'present', topicCovered: 'A2 Magnetic fields & Hall probe effect' },
  { id: 'att-5', date: getSampleRelDate(0), studentId: 'std-5', status: 'late', topicCovered: 'Organic reaction mechanisms overview', remarks: 'Joined 15 mins late due to traffic' },
  { id: 'att-6', date: getSampleRelDate(0), studentId: 'std-6', status: 'present', topicCovered: 'Class 9th Physics - Unit 2 Numericals' },
  
  // Previous sessions
  { id: 'att-7', date: getSampleRelDate(2), studentId: 'std-1', status: 'present', topicCovered: 'Work energy theorem derivation' },
  { id: 'att-8', date: getSampleRelDate(2), studentId: 'std-2', status: 'present', topicCovered: 'Coordinate geometry midpoint formulas' },
  { id: 'att-9', date: getSampleRelDate(2), studentId: 'std-3', status: 'present', topicCovered: 'Chapter 2 quadratic equations review' },
  { id: 'att-10', date: getSampleRelDate(2), studentId: 'std-4', status: 'present', topicCovered: 'Oscillations and Simple Harmonic Motion' },
  { id: 'att-11', date: getSampleRelDate(2), studentId: 'std-5', status: 'present', topicCovered: 'Chemical bonding and hybridization' },
  
  { id: 'att-12', date: getSampleRelDate(4), studentId: 'std-1', status: 'present', topicCovered: 'Conservation of energy in falling bodies' },
  { id: 'att-13', date: getSampleRelDate(4), studentId: 'std-2', status: 'absent', remarks: 'Informed family function', topicCovered: 'Recorded lecture sent' },
  { id: 'att-14', date: getSampleRelDate(4), studentId: 'std-3', status: 'present', topicCovered: 'Synthetic division problems' },
  { id: 'att-15', date: getSampleRelDate(4), studentId: 'std-4', status: 'present', topicCovered: 'Damped and forced oscillations' },
  { id: 'att-16', date: getSampleRelDate(4), studentId: 'std-5', status: 'present', topicCovered: 'Hybridization sp3, sp2, sp' }
];

export const INITIAL_FEES: FeeRecord[] = [
  {
    id: 'fee-1',
    studentId: 'std-1',
    month: 'August 2026',
    year: 2026,
    totalFee: 18000,
    discount: 0,
    paidAmount: 18000,
    dueAmount: 0,
    status: 'paid',
    dueDate: '2026-08-05',
    paidDate: '2026-08-04',
    paymentMethod: 'Bank Transfer',
    receiptNo: 'SAP-REC-2608-01',
    remarks: 'Received via Meezan Bank online transfer. Thank you!'
  },
  {
    id: 'fee-2',
    studentId: 'std-2',
    month: 'August 2026',
    year: 2026,
    totalFee: 22000,
    discount: 0,
    paidAmount: 22000,
    dueAmount: 0,
    status: 'paid',
    dueDate: '2026-08-10',
    paidDate: '2026-08-08',
    paymentMethod: 'JazzCash',
    receiptNo: 'SAP-REC-2608-02',
    remarks: 'Paid full for 3 subjects package.'
  },
  {
    id: 'fee-3',
    studentId: 'std-3',
    month: 'August 2026',
    year: 2026,
    totalFee: 15000,
    discount: 1000,
    paidAmount: 14000,
    dueAmount: 0,
    status: 'paid',
    dueDate: '2026-08-05',
    paidDate: '2026-08-06',
    paymentMethod: 'Cash',
    receiptNo: 'SAP-REC-2608-03',
    remarks: 'Cash handed by father during home visit.'
  },
  {
    id: 'fee-4',
    studentId: 'std-4',
    month: 'August 2026',
    year: 2026,
    totalFee: 25000,
    discount: 0,
    paidAmount: 0,
    dueAmount: 25000,
    status: 'overdue',
    dueDate: '2026-08-07',
    remarks: 'Due date passed (7th Aug). Gentle reminder needed.'
  },
  {
    id: 'fee-5',
    studentId: 'std-5',
    month: 'August 2026',
    year: 2026,
    totalFee: 19000,
    discount: 0,
    paidAmount: 10000,
    dueAmount: 9000,
    status: 'partial',
    dueDate: '2026-08-05',
    paidDate: '2026-08-05',
    paymentMethod: 'EasyPaisa',
    receiptNo: 'SAP-REC-2608-05',
    remarks: 'Half fee paid on 5th Aug, remaining 9,000 promised on 20th Aug.'
  },
  {
    id: 'fee-6',
    studentId: 'std-6',
    month: 'August 2026',
    year: 2026,
    totalFee: 14000,
    discount: 0,
    paidAmount: 0,
    dueAmount: 14000,
    status: 'overdue',
    dueDate: '2026-08-10',
    remarks: 'Due date was 10th August. Sent first reminder.'
  },
  // July records for historical charts
  {
    id: 'fee-7',
    studentId: 'std-1',
    month: 'July 2026',
    year: 2026,
    totalFee: 18000,
    discount: 0,
    paidAmount: 18000,
    dueAmount: 0,
    status: 'paid',
    dueDate: '2026-07-05',
    paidDate: '2026-07-03',
    paymentMethod: 'Bank Transfer',
    receiptNo: 'SAP-REC-2607-01'
  },
  {
    id: 'fee-8',
    studentId: 'std-2',
    month: 'July 2026',
    year: 2026,
    totalFee: 22000,
    discount: 0,
    paidAmount: 22000,
    dueAmount: 0,
    status: 'paid',
    dueDate: '2026-07-10',
    paidDate: '2026-07-09',
    paymentMethod: 'JazzCash',
    receiptNo: 'SAP-REC-2607-02'
  },
  {
    id: 'fee-9',
    studentId: 'std-3',
    month: 'July 2026',
    year: 2026,
    totalFee: 15000,
    discount: 1000,
    paidAmount: 14000,
    dueAmount: 0,
    status: 'paid',
    dueDate: '2026-07-05',
    paidDate: '2026-07-05',
    paymentMethod: 'Cash',
    receiptNo: 'SAP-REC-2607-03'
  },
  {
    id: 'fee-10',
    studentId: 'std-4',
    month: 'July 2026',
    year: 2026,
    totalFee: 25000,
    discount: 0,
    paidAmount: 25000,
    dueAmount: 0,
    status: 'paid',
    dueDate: '2026-07-07',
    paidDate: '2026-07-06',
    paymentMethod: 'Bank Transfer',
    receiptNo: 'SAP-REC-2607-04'
  }
];
