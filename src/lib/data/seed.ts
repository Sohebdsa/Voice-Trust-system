import { createHash } from "node:crypto";
import type {
  Activity,
  ActivityAttachment,
  ActivityParticipant,
  ActivityStaff,
  ActivityType,
  Beneficiary,
  Db,
  DonorDisbursement,
  Employee,
  Farmer,
  Indicator,
  IndicatorValue,
  Profile,
  PwdFollowup,
  PwdIntervention,
  PwdProfile,
  Role,
  SavingsTransaction,
  Shg,
  ShgMember,
  Village,
} from "./types";

/** Deterministic PRNG so every reload shows the same prototype data. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20261117);
const pick = <T,>(list: readonly T[]): T => list[Math.floor(rnd() * list.length)] as T;
const between = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;

const iso = (d: Date) => d.toISOString().slice(0, 10);
const stamp = (d: Date) => d.toISOString();
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9, 30, 0, 0);
  return d;
};
const daysAhead = (n: number) => daysAgo(-n);

export const DEMO_PASSWORD = "Voice@2026";
export const hashPassword = (password: string) =>
  createHash("sha256").update(`voice-trust::${password}`).digest("hex");

const FIRST_NAMES = {
  female: [
    "Sunita", "Asha", "Meera", "Neha", "Pooja", "Sanjana", "Vaishali", "Rekha", "Kavita",
    "Sharda", "Manisha", "Snehal", "Archana", "Lata", "Sushma", "Rupali", "Jyoti", "Anita",
    "Vandana", "Shubhangi", "Pallavi", "Nanda", "Sangeeta", "Bharati",
  ],
  male: [
    "Ravi", "Pranav", "Sameer", "Suresh", "Ganesh", "Mahesh", "Vikas", "Sachin", "Dattatray",
    "Nitin", "Rohit", "Amit", "Kiran", "Balu", "Pravin", "Santosh", "Ashok", "Vijay", "Rahul",
    "Devendra", "Shrikant", "Yogesh",
  ],
  other: ["Kiran", "Aniket"],
} as const;

const LAST_NAMES = [
  "Patil", "Shinde", "Kadam", "More", "Deshmukh", "Joshi", "Kulkarni", "Naik", "Pawar",
  "Bhagat", "Gaikwad", "Wagh", "Chavan", "Jadhav", "Suryawanshi", "Salunkhe", "Bhoir",
  "Dhake", "Mhatre", "Thakur",
];

const VILLAGE_NAMES = [
  ["Kalyan", "Murbad"], ["Shivale", "Murbad"], ["Dhasai", "Murbad"], ["Kasheli", "Murbad"],
  ["Tokawade", "Murbad"], ["Vadap", "Murbad"], ["Saralgaon", "Murbad"], ["Khutghar", "Murbad"],
  ["Moroshi", "Murbad"], ["Aghai", "Shahapur"], ["Umberpada", "Shahapur"], ["Deogaon", "Shahapur"],
  ["Nandgaon", "Shahapur"], ["Vashala", "Shahapur"], ["Bhadane", "Shahapur"],
  ["Kasar Amboli", "Kalyan"], ["Khopoli", "Kalyan"], ["Vasind", "Kalyan"],
] as const;

const CROPS = ["Rice", "Wheat", "Finger millet", "Pigeon pea", "Groundnut", "Vegetables", "Sugarcane"];

function makeId(prefix: string, n: number) {
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

export function buildSeed(): Db {
  /* ---------------- Villages ---------------- */
  const villages: Village[] = VILLAGE_NAMES.map(([name, block], i) => ({
    id: makeId("vil", i + 1),
    code: `VIL-${String(i + 1).padStart(3, "0")}`,
    name,
    panchayat: `${name} Gram Panchayat`,
    block,
    district: "Thane",
    state: "Maharashtra",
    population: between(900, 6400),
    status: "active",
  }));
  const villageId = (i: number) => villages[i % villages.length]!.id;

  /* ---------------- Profiles and employees ---------------- */
  const people: { name: string; role: Role; email: string; designation: string; dept: string }[] = [
    { name: "Asha Deshmukh", role: "admin", email: "asha.deshmukh@voicetrust.org", designation: "Executive Director", dept: "Leadership" },
    { name: "Pranav Joshi", role: "programme_manager", email: "pranav.joshi@voicetrust.org", designation: "Programme Manager", dept: "Programmes" },
    { name: "Meera Kulkarni", role: "project_coordinator", email: "meera.kulkarni@voicetrust.org", designation: "Project Coordinator", dept: "Programmes" },
    { name: "Sameer Patil", role: "mel_officer", email: "sameer.patil@voicetrust.org", designation: "MEL Officer", dept: "Monitoring & Evaluation" },
    { name: "Ravi Shinde", role: "field_staff", email: "ravi.shinde@voicetrust.org", designation: "Field Staff", dept: "Field Operations" },
    { name: "Suresh Naik", role: "finance", email: "suresh.naik@voicetrust.org", designation: "Finance Officer", dept: "Finance" },
    { name: "Pooja More", role: "data_entry", email: "pooja.more@voicetrust.org", designation: "Data Entry Operator", dept: "Programmes" },
  ];

  const extraStaff: { name: string; designation: string; dept: string }[] = [
    { name: "Ganesh Pawar", designation: "Field Staff", dept: "Field Operations" },
    { name: "Vaishali Bhagat", designation: "Field Staff", dept: "Field Operations" },
    { name: "Sachin Gaikwad", designation: "Project Coordinator", dept: "Programmes" },
    { name: "Rekha Salunkhe", designation: "MEL Associate", dept: "Monitoring & Evaluation" },
    { name: "Nitin Wagh", designation: "Accounts Assistant", dept: "Finance" },
    { name: "Sharda Mhatre", designation: "Admin Assistant", dept: "Administration" },
  ];

  const staffSeeds: { name: string; designation: string; dept: string; email?: string }[] = [
    ...people.map((p) => ({ name: p.name, designation: p.designation, dept: p.dept, email: p.email })),
    ...extraStaff,
  ];

  const employees: Employee[] = staffSeeds.map((p, i) => ({
    id: makeId("emp", i + 1),
    code: `EMP-${String(i + 1).padStart(3, "0")}`,
    fullName: p.name,
    gender: (FIRST_NAMES.female as readonly string[]).includes(p.name.split(" ")[0]!) ? "female" : "male",
    dateOfBirth: iso(new Date(1976 + between(0, 24), between(0, 11), between(1, 28))),
    mobile: `9${between(700000000, 899999999)}`,
    email: p.email ?? `${p.name.toLowerCase().replace(/\s+/g, ".")}@voicetrust.org`,
    designation: p.designation,
    department: p.dept,
    dateOfJoining: iso(daysAgo(between(200, 2600))),
    employmentType: i > 10 ? "contract" : "permanent",
    employmentStatus: i === 12 ? "exited" : "active",
    userId: null,
  }));

  const profiles: Profile[] = people.map((p, i) => ({
    id: `usr-${String(i + 1).padStart(2, "0")}`,
    fullName: p.name,
    email: p.email,
    role: p.role,
    employeeId: employees[i]!.id,
    isActive: true,
    passwordHash: hashPassword(DEMO_PASSWORD),
  }));
  profiles.forEach((profile, i) => {
    employees[i]!.userId = profile.id;
  });

  /* ---------------- Donors, programmes, projects ---------------- */
  const donors = [
    { name: "Tata Trusts", type: "Foundation", person: "R. Iyer", budget: 4800000 },
    { name: "HDFC Parivartan", type: "Corporate CSR", person: "S. Menon", budget: 3200000 },
    { name: "Azim Premji Foundation", type: "Foundation", person: "A. Rao", budget: 2500000 },
    { name: "NABARD", type: "Government", person: "P. Kulkarni", budget: 1800000 },
  ].map((d, i) => ({
    id: makeId("don", i + 1),
    code: `DON-${String(i + 1).padStart(3, "0")}`,
    name: d.name,
    donorType: d.type,
    contactPerson: d.person,
    email: `grants@${d.name.toLowerCase().replace(/[^a-z]+/g, "")}.org`,
    phone: `022${between(20000000, 49999999)}`,
    grantStart: iso(daysAgo(420 - i * 30)),
    grantEnd: iso(daysAhead(300 + i * 40)),
    approvedBudget: d.budget,
    status: "active" as const,
  }));

  const programmes = [
    { name: "Sustainable Agriculture & Farmer Support", focus: "Agriculture", desc: "Soil health, organic inputs and market linkage for small and marginal farmers." },
    { name: "Women's SHG & Livelihood", focus: "Livelihood", desc: "Self-help group formation, savings discipline and enterprise support for women." },
    { name: "Disability Inclusion (GAP)", focus: "Disability inclusion", desc: "Identification, assistive devices, education and livelihood support for persons with disability." },
  ].map((p, i) => ({
    id: makeId("prg", i + 1),
    code: `PRG-${String(i + 1).padStart(3, "0")}`,
    name: p.name,
    description: p.desc,
    focusArea: p.focus,
    startDate: iso(daysAgo(500 - i * 40)),
    endDate: iso(daysAhead(320 - i * 30)),
    coordinatorId: employees[i + 1]!.id,
    status: "active" as const,
  }));

  const projects = [
    { name: "Soil Health & Organic Transition", donor: 0, programme: 0, status: "active", villages: [0, 1, 2, 3], budget: 1800000, target: 900, coord: 2 },
    { name: "Farmer Producer Collective", donor: 3, programme: 0, status: "active", villages: [4, 5, 6], budget: 1200000, target: 650, coord: 2 },
    { name: "SHG Savings & Credit Strengthening", donor: 1, programme: 1, status: "active", villages: [0, 2, 7, 8], budget: 1500000, target: 480, coord: 10 },
    { name: "Women's Enterprise Incubation", donor: 2, programme: 1, status: "draft", villages: [9, 10], budget: 900000, target: 300, coord: 2 },
    { name: "GAP Identification & Assistive Devices", donor: 0, programme: 2, status: "active", villages: [11, 12, 13], budget: 1100000, target: 260, coord: 10 },
    { name: "Inclusive Education Bridge", donor: 2, programme: 2, status: "completed", villages: [14, 15], budget: 700000, target: 180, coord: 10 },
  ].map((p, i) => ({
    id: makeId("prj", i + 1),
    code: `PRJ-${String(i + 1).padStart(3, "0")}`,
    name: p.name,
    donorId: donors[p.donor]!.id,
    programmeId: programmes[p.programme]!.id,
    startDate: iso(daysAgo(430 - i * 20)),
    endDate: iso(daysAhead(p.status === "completed" ? -40 : 300 - i * 10)),
    approvedBudget: p.budget,
    coordinatorId: employees[p.coord]!.id,
    targetBeneficiaries: p.target,
    status: p.status as "active" | "draft" | "completed",
    villageIds: p.villages.map(villageId),
  }));

  /* ---------------- Beneficiaries ---------------- */
  const genders: ("male" | "female" | "other")[] = ["female", "female", "female", "male", "male", "other"];
  const beneficiaries: Beneficiary[] = Array.from({ length: 120 }, (_, i) => {
    const gender = genders[i % genders.length]!;
    const fullName = `${pick(FIRST_NAMES[gender])} ${pick(LAST_NAMES)}`;
    const projectIds = [projects[i % 3]!.id];
    if (i % 4 === 0) projectIds.push(projects[(i + 2) % 3]!.id);
    return {
      id: makeId("ben", i + 1),
      code: `BEN-${String(i + 1).padStart(6, "0")}`,
      fullName,
      gender,
      dateOfBirth: iso(new Date(1955 + between(0, 50), between(0, 11), between(1, 28))),
      mobile: `9${between(700000000, 899999999)}`,
      alternateContact: i % 3 === 0 ? `8${between(700000000, 999999999)}` : null,
      addressLine: `House ${between(1, 240)}, ${pick(["Shivaji Nagar", "Gandhi Chowk", "Ambedkar Vasahat", "Station Road"])}`,
      villageId: villageId(i),
      enrolmentDate: iso(daysAgo(between(10, 300))),
      status: i % 29 === 0 ? "inactive" : "active",
      idProofType: pick(["aadhaar", "voter", "ration"] as const),
      idProofLast4: String(between(1000, 9999)),
      createdBy: pick(["Asha Deshmukh", "Rohit Kulkarni", "Meera Joshi", "Sunil Pawar"]),
      createdAt: iso(daysAgo(between(200, 400))),
      updatedAt: iso(daysAgo(between(1, 60))),
      projectIds,
      consentGivenOn: iso(daysAgo(between(10, 300))),
    };
  });

  /* ---------------- Farmer profiles ---------------- */
  const farmers: Farmer[] = beneficiaries.slice(0, 46).map((b, i) => {
    const acres = Number((between(5, 60) / 10).toFixed(1));
    return {
      id: makeId("frm", i + 1),
      code: `FRM-${String(i + 1).padStart(5, "0")}`,
      beneficiaryId: b.id,
      landHoldingAcres: acres,
      landOwnership: pick(["owned", "owned", "leased", "shared", "landless"] as const),
      farmingType: pick(["conventional", "organic", "mixed", "mixed"] as const),
      organicStatus: pick(["none", "none", "in_conversion", "certified"] as const),
      irrigationSource: pick(["Well", "Canal", "Rain-fed", "Borewell"]),
      trainingDetails: pick([
        "Organic certification orientation (2 days)",
        "Bio-input preparation and seed treatment training",
        "IPM and soil health card workshop",
      ]),
      enrolmentDate: iso(daysAgo(between(30, 250))),
      farmerGroup: i % 4 === 0 ? `FGRP-${String(between(1, 12)).padStart(2, "0")}` : null,
      organicPractices: "Neem cake, Jeevamrut, vermicompost application",
      supportReceived: "Soil testing kit, bio-fertilizer starter pack",
      equipmentReceived: "Battery sprayer, weeding tools",
      gpsLatitude: Number((19.24 + (i % 20) * 0.005).toFixed(6)),
      gpsLongitude: Number((73.18 + (i % 20) * 0.005).toFixed(6)),
      followupNotes: "Active participation in farmer study circles.",
      status: "active",
      crops: Array.from({ length: between(1, 2) }, () => ({
        season: pick(["kharif", "rabi", "zaid", "perennial"] as const),
        crop: pick(CROPS),
        areaAcres: Number((between(4, 30) / 10).toFixed(1)),
      })),
    };
  });

  /* ---------------- SHGs ---------------- */
  const shgs: Shg[] = [0, 2, 7, 9].map((v, i) => ({
    id: makeId("shg", i + 1),
    code: `SHG-${String(i + 1).padStart(4, "0")}`,
    name: ["Savitribai Mahila Gat", "Bhagirathi Mahila Gat", "Jijau Mahila Gat", "Radha Mahila Gat"][i]!,
    villageId: villageId(v),
    formationDate: iso(daysAgo(between(300, 900))),
    meetingFrequency: "monthly",
    numberOfMembers: between(5, 20),
    livelihoodActivity: pick(["Agriculture", "Handicrafts", "Livestock", "Retail"] as const),
    bankName: pick(["State Bank of India", "Bank of Baroda", "HDFC Bank", "ICICI Bank"] as const),
    bankAccountNo: `9${between(100000000, 999999999)}`,
    ifscCode: `SBIN0${String(between(1000, 9999))}`,
    bankLinkageDate: iso(daysAgo(between(100, 500))),
    supportReceived: "Capacity building grant, equipment support",
    status: "active",
    // Link each SHG to the project covering their village (WF-04)
    projectIds: [projects[2]!.id],
  }));

  const shgMembers: ShgMember[] = beneficiaries.slice(46, 78).map((b, i) => {
    const roleIndex = i % 8;
    return {
      id: makeId("shm", i + 1),
      shgId: shgs[Math.floor(i / 8)]!.id,
      beneficiaryId: b.id,
      role: roleIndex === 0 ? "president" : roleIndex === 1 ? "secretary" : roleIndex === 2 ? "treasurer" : "member",
      joinDate: iso(daysAgo(between(60, 700))),
      status: "active",
      memberId: `shm-${String(i + 47).padStart(6, "0")}`,
      savingsBalance: Number((between(100, 5000) / 10).toFixed(1)),
      totalSavingsToDate: Number((between(500, 20000) / 10).toFixed(1)),
      internalLendingStatus: pick(["active", "restricted", "none"] as const),
      bankLinkageStatus: pick(["linked", "pending", "none"] as const),
      loanDetails: pick(["SHG loan, micro-credit", "No loan", "Enterprise loan"] as const),
      attendanceRecords: pick(["Register entries, 90% attendance", "Register entries, 80% attendance", "Register entries, 70% attendance"] as const),
      trainingRecords: pick(["Training completed - financial literacy", "Training completed - SHG bookkeeping", "No training yet"] as const),
    };
  });

  const savings: SavingsTransaction[] = shgMembers.flatMap((m, i) =>
    Array.from({ length: between(2, 3) }, (_, k) => ({
      id: makeId("svt", i * 3 + k + 1),
      shgMemberId: m.id,
      txnDate: iso(daysAgo(30 * k + between(0, 25))),
      txnType: (rnd() > 0.92 ? "withdrawal" : "deposit") as "withdrawal" | "deposit",
      amount: between(100, 600),
    })),
  );

  /* ---------------- PWD profiles ---------------- */
  const pwdProfiles: PwdProfile[] = beneficiaries.slice(78, 96).map((b, i) => ({
    id: makeId("pwd", i + 1),
    code: `PWD-${String(i + 1).padStart(4, "0")}`,
    beneficiaryId: b.id,
    disabilityType: pick(["Locomotor", "Visual", "Hearing", "Intellectual", "Multiple"]),
    disabilityPercentage: between(40, 90),
    certificateNo: `MH/TH/2024/${between(10000, 99999)}`,
    certificateIssueDate: iso(daysAgo(400 + i * 15)),
    certificateIssuingAuthority: "District Civil Surgeon, Thane",
    educationLevel: pick(["Primary", "Secondary", "Higher secondary", "None"]),
    vocationalStatus: pick(["Trained", "Seeking work", "Self-employed", "Not working"]),
    accessibilityNeeds: "Ramp access, tactile guidance",
    assistiveDevice: i % 2 === 0 ? "Wheelchair" : "Hearing aid kit",
    individualPlan: "Livelihood training and SHG inclusion",
    outcome: "Regularly participating in village committee meetings",
    status: "active",
  }));

  const pwdInterventions = pwdProfiles.flatMap((p, i) => [
    {
      id: `int-${p.id}-1`,
      pwdId: p.id,
      interventionType: "Assistive Device Distribution",
      givenOn: iso(daysAgo(180 - i * 5)),
      description: `Provided ${p.assistiveDevice ?? "adaptive aids"} and user orientation`,
    },
    {
      id: `int-${p.id}-2`,
      pwdId: p.id,
      interventionType: "Government Scheme Enrolment",
      givenOn: iso(daysAgo(90 - i * 3)),
      description: "Assisted with state disability pension application",
    },
  ]);

  const pwdFollowups = pwdProfiles.map((p, i) => ({
    id: `flw-${p.id}-1`,
    pwdId: p.id,
    followupDate: iso(daysAgo(30 + i * 2)),
    notes: "Home visit conducted. Device in active use and good condition.",
    recordedBy: employees[4]!.id,
  }));

  /* ---------------- Activities ---------------- */
  const activityTitles: Record<ActivityType, string[]> = {
    training: ["Soil health training", "Organic input preparation", "SHG bookkeeping training", "Kitchen garden training"],
    awareness: ["Disability rights awareness", "Nutrition awareness camp", "Government scheme awareness"],
    meeting: ["SHG monthly meeting", "Farmer group meeting", "Village coordination meeting"],
    field_visit: ["Field visit — crop assessment", "Follow-up visit", "Home visit — PWD follow-up"],
    distribution: ["Seed distribution", "Assistive device distribution", "Toolkit distribution"],
    other: ["Village exposure visit", "Documentation support"],
  };
  const activityTypes = Object.keys(activityTitles) as ActivityType[];

  const venues = ["Gram Panchayat Hall", "Anganwadi centre", "Community hall", "School ground", "VOICE field office", "Farmer's field"];
  const resourcePersonNames = [
    "Dr. Ramesh Patil (ATMA), Block Agriculture Officer",
    "Smt. Kavita Jadhav, VOICE Trust field coordinator",
    "Shri Dattatreya More, Krishi Vigyan Kendra",
    "Ms. Anita Sawant, NABARD district officer",
  ];
  const outputsResultsText = [
    "Session completed as planned; attendance sheet collected.",
    "40 seed kits distributed; demonstration of the improved method conducted.",
    "Group reviewed last month's savings register and set next month's target.",
    "Participants identified follow-up needs; three home visits scheduled.",
  ];

  const now = new Date();
  const activities: Activity[] = Array.from({ length: 30 }, (_, i) => {
    const type = activityTypes[i % activityTypes.length]!;
    const project = projects[i % 5]!;
    // Three activities per month for the last ten months, so the 12-month chart has
    // real movement and the monthly delta compares like with like.
    const monthOffset = Math.floor(i / 3);
    const monthStart = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const lastDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    const day = monthOffset === 0 ? between(1, Math.max(now.getDate(), 1)) : between(1, lastDay);
    const when = new Date(monthStart.getFullYear(), monthStart.getMonth(), Math.min(day, lastDay));
    const villageId = project.villageIds[i % project.villageIds.length]!;
    return {
      id: makeId("act", i + 1),
      code: `ACT-${String(i + 1).padStart(5, "0")}`,
      programmeId: project.programmeId,
      projectId: project.id,
      title: pick(activityTitles[type]),
      description: "",
      activityType: type,
      startDate: iso(when),
      endDate: iso(when),
      villageId,
      targetParticipants: between(20, 60),
      status: "completed" as const,
      expenditure: between(2000, 18000),
      location: `${pick(venues)}, ${villages.find((v) => v.id === villageId)?.name ?? project.name}`,
      resourcePersons: pick(resourcePersonNames),
      outputsResults: pick(outputsResultsText),
    };
  });

  // The four newest activities are still upcoming, so planned and completed both
  // appear on the dashboard (PRD §7.7).
  const plannedIds = new Set(
    [...activities]
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
      .slice(0, 4)
      .map((a) => a.id),
  );
  activities.forEach((activity) => {
    if (plannedIds.has(activity.id)) activity.status = "planned";
  });

  const participants: ActivityParticipant[] = activities.flatMap((a) => {
    if (a.status === "planned") return [];
    const count = between(8, 18);
    const start = (Number(a.code.slice(-5)) * 7) % 100;
    return Array.from({ length: count }, (_, k) => ({
      activityId: a.id,
      beneficiaryId: beneficiaries[(start + k) % beneficiaries.length]!.id,
      attended: rnd() > 0.15,
    }));
  });

  const activityStaff: ActivityStaff[] = activities.flatMap((a, i) => {
    const first = employees[i % employees.length]!;
    const second = employees[(i + 4) % employees.length]!;
    return [...new Set([first.id, second.id])].map((employeeId) => ({ activityId: a.id, employeeId }));
  });

  // Filenames only — the prototype never holds the org's files.
  const activityAttachments: ActivityAttachment[] = activities
    .filter((a) => a.status === "completed")
    .slice(0, 6)
    .flatMap((a) => [
      { id: `att-${a.id}-1`, activityId: a.id, filePath: `attendance-${a.code.toLowerCase()}.pdf`, kind: "document" as const, caption: "Attendance sheet" },
      { id: `att-${a.id}-2`, activityId: a.id, filePath: `session-${a.code.toLowerCase()}.jpg`, kind: "photo" as const, caption: "Session in progress" },
    ]);

  /* ---------------- MEL ---------------- */
  const indicatorNames = [
    ["Farmers trained in organic practices", "farmers"],
    ["Acres under improved practice", "acres"],
    ["SHG members with active savings", "members"],
    ["Average savings per member", "INR"],
    ["Women in leadership roles", "women"],
    ["PWD with assistive devices", "persons"],
    ["PWD linked to entitlements", "persons"],
  ] as const;

  const indicators: Indicator[] = Array.from({ length: 12 }, (_, i) => {
    const project = projects[i % 5]!;
    const [name, unit] = indicatorNames[i % indicatorNames.length]!;
    return {
      id: makeId("ind", i + 1),
      code: `IND-${String(i + 1).padStart(3, "0")}`,
      projectId: project.id,
      name,
      unit,
      description: `${name} recorded for the ${project.name} project, as reported by the field team.`,
      baseline: between(0, 40),
      target: between(120, 600),
      reportingFrequency: i % 3 === 0 ? "monthly" : "quarterly",
      dataSource:
        i % 2 === 0
          ? "Activity attendance registers and participant lists"
          : "Field survey and SHG savings registers",
      responsibleEmployeeId: i % 2 === 0 ? employees[3]!.id : employees[10]!.id,
      genderDisaggregated: i % 2 === 0,
      status: i === 11 ? "inactive" : "active",
    };
  });

  const indicatorValues: IndicatorValue[] = indicators.flatMap((ind, idx) => {
    const periods = ind.reportingFrequency === "monthly" ? 3 : 2;
    return Array.from({ length: periods }, (_, k) => {
      const end = daysAgo(k * 30 + 5);
      const start = daysAgo(k * 30 + 35);
      // Mix of on-track and behind indicators so every chip appears in the demo.
      const share = idx % 3 === 0 ? between(50, 85) : between(5, 28);
      const value = Math.round((ind.target * share) / 100);
      const male = ind.genderDisaggregated ? Math.round(value * 0.45) : null;
      return {
        id: makeId("inv", idx * 3 + k + 1),
        indicatorId: ind.id,
        periodStart: iso(start),
        periodEnd: iso(end),
        value,
        maleValue: male,
        femaleValue: male === null ? null : value - male,
        remarks:
          k === 0
            ? "Verified against the attendance register."
            : "Provisional; pending field verification.",
        enteredBy: profiles[3]!.id,
        enteredAt: stamp(daysAgo(k * 30 + 4)),
      };
    });
  });

  /* ---------------- Audit log ---------------- */
  const audit = Array.from({ length: 40 }, (_, i) => {
    const profile = profiles[i % profiles.length]!;
    return {
      id: makeId("aud", i + 1),
      actorId: profile.id,
      actorName: profile.fullName,
      action: pick(["create", "update", "export", "login", "view_sensitive"] as const),
      tableName: pick(["beneficiaries", "activities", "projects", "employees", "pwd_profiles"]),
      recordId: makeId("ben", between(1, 120)),
      at: stamp(daysAgo(between(0, 20))),
    };
  });

  /* ---------------- Scopes (PRD §5.2) ---------------- */
  const userScopes = [
    { userId: profiles[1]!.id, programmeId: programmes[0]!.id, projectId: null, villageId: null },
    { userId: profiles[1]!.id, programmeId: programmes[1]!.id, projectId: null, villageId: null },
    { userId: profiles[2]!.id, programmeId: null, projectId: projects[0]!.id, villageId: null },
    { userId: profiles[2]!.id, programmeId: null, projectId: projects[2]!.id, villageId: null },
    { userId: profiles[4]!.id, programmeId: null, projectId: null, villageId: villages[0]!.id },
    { userId: profiles[4]!.id, programmeId: null, projectId: null, villageId: villages[1]!.id },
    { userId: profiles[4]!.id, programmeId: null, projectId: null, villageId: villages[2]!.id },
  ];

  /* ---------------- Donor disbursements (WF-01) ---------------- */
  const donorDisbursements: DonorDisbursement[] = [
    // Ambuja Cement Foundation → Soil Health project: two tranches received
    { id: "dsb-001", donorId: donors[0]!.id, projectId: projects[0]!.id, amount: 900000, disbursedOn: iso(daysAgo(360)), notes: "First tranche — 50% on signing", recordedBy: profiles[0]!.id, recordedAt: stamp(daysAgo(360)) },
    { id: "dsb-002", donorId: donors[0]!.id, projectId: projects[0]!.id, amount: 450000, disbursedOn: iso(daysAgo(180)), notes: "Second tranche — 25% at mid-term review", recordedBy: profiles[0]!.id, recordedAt: stamp(daysAgo(180)) },
    // Azim Premji Foundation → SHG project: one tranche
    { id: "dsb-003", donorId: donors[2]!.id, projectId: projects[2]!.id, amount: 750000, disbursedOn: iso(daysAgo(300)), notes: "Initial disbursement", recordedBy: profiles[0]!.id, recordedAt: stamp(daysAgo(300)) },
    // NABARD → Farmer Producer project
    { id: "dsb-004", donorId: donors[3]!.id, projectId: projects[1]!.id, amount: 600000, disbursedOn: iso(daysAgo(200)), notes: "Phase 1 grant release", recordedBy: profiles[0]!.id, recordedAt: stamp(daysAgo(200)) },
  ];

  return {
    profiles,
    userScopes,
    villages,
    donors,
    donorDisbursements,
    programmes,
    projects,
    employees,
    beneficiaries,
    farmers,
    pwdProfiles,
    pwdInterventions,
    pwdFollowups,
    shgs,
    shgMembers,
    savings,
    activities,
    participants,
    activityStaff,
    activityAttachments,
    indicators,
    indicatorValues,
    audit,
  };
}
