const CLIENTS = [
  {
    id: "miller",
    name: "James & Sarah Miller",
    client1: { name: "James Miller", dob: "1968-03-14", ssn: "4821" },
    client2: { name: "Sarah Miller", dob: "1970-09-22", ssn: "7634" },
    salary: 15000,
    expenseBudget: 11000,
    privateReserveTarget: null, // auto-calculated: 6x expenses + deductibles
    insuranceDeductibles: 3500,
    accounts: {
      retirement_c1: [
        { type: "401(k)", lastFour: "2241", lastBalance: 487500 },
        { type: "Roth IRA", lastFour: "8812", lastBalance: 143200 },
      ],
      retirement_c2: [
        { type: "IRA", lastFour: "5530", lastBalance: 211000 },
        { type: "Roth IRA", lastFour: "9901", lastBalance: 88400 },
      ],
      nonRetirement: [
        { type: "Joint Brokerage", lastFour: "3377", lastBalance: 325000 },
      ],
      trust: { address: "412 Peachtree Hills Ave, Atlanta, GA 30305", lastZillow: 875000 },
      liabilities: [
        { type: "Mortgage", rate: "3.25%", lastBalance: 412000 },
        { type: "Auto Loan", rate: "5.10%", lastBalance: 18500 },
      ],
      pinnacle: {
        checking: { lastFour: "1102", lastBalance: 12400 },
        reserve: { lastFour: "7743", lastBalance: 68200 },
      },
    },
    lastReport: "2025-12-31",
    lastReportData: null,
  },
  {
    id: "chen",
    name: "David & Linda Chen",
    client1: { name: "David Chen", dob: "1962-07-08", ssn: "3390" },
    client2: { name: "Linda Chen", dob: "1964-11-30", ssn: "6127" },
    salary: 22000,
    expenseBudget: 14000,
    insuranceDeductibles: 5000,
    accounts: {
      retirement_c1: [
        { type: "401(k)", lastFour: "4412", lastBalance: 1240000 },
        { type: "IRA", lastFour: "8823", lastBalance: 340000 },
        { type: "Pension", lastFour: "0011", lastBalance: 620000 },
      ],
      retirement_c2: [
        { type: "Roth IRA", lastFour: "2255", lastBalance: 198000 },
        { type: "IRA", lastFour: "7799", lastBalance: 410000 },
      ],
      nonRetirement: [
        { type: "Joint Brokerage", lastFour: "6644", lastBalance: 780000 },
        { type: "Individual Brokerage", lastFour: "3312", lastBalance: 220000 },
      ],
      trust: { address: "85 West Paces Ferry Rd, Atlanta, GA 30305", lastZillow: 1450000 },
      liabilities: [
        { type: "Mortgage", rate: "2.875%", lastBalance: 580000 },
      ],
      pinnacle: {
        checking: { lastFour: "5501", lastBalance: 28000 },
        reserve: { lastFour: "4422", lastBalance: 145000 },
      },
    },
    lastReport: "2025-12-31",
    lastReportData: null,
  },
  {
    id: "thompson",
    name: "Robert Thompson",
    client1: { name: "Robert Thompson", dob: "1955-05-19", ssn: "8847" },
    client2: null,
    salary: 8500,
    expenseBudget: 6000,
    insuranceDeductibles: 2000,
    accounts: {
      retirement_c1: [
        { type: "IRA", lastFour: "9921", lastBalance: 1850000 },
        { type: "Roth IRA", lastFour: "4430", lastBalance: 95000 },
      ],
      retirement_c2: [],
      nonRetirement: [
        { type: "Individual Brokerage", lastFour: "7712", lastBalance: 430000 },
      ],
      trust: { address: "1240 Habersham Rd NW, Atlanta, GA 30318", lastZillow: 920000 },
      liabilities: [
        { type: "Mortgage", rate: "4.00%", lastBalance: 225000 },
        { type: "HELOC", rate: "7.25%", lastBalance: 45000 },
      ],
      pinnacle: {
        checking: { lastFour: "6603", lastBalance: 9800 },
        reserve: { lastFour: "2281", lastBalance: 52000 },
      },
    },
    lastReport: "2025-12-31",
    lastReportData: null,
  },
];
