/**
 * Domain types — field names follow PRD §4 verbatim so the mock layer reads like
 * the production schema and can be swapped for Drizzle queries later.
 */

export type Role =
  | "admin"
  | "programme_manager"
  | "project_coordinator"
  | "mel_officer"
  | "field_staff"
  | "hr_admin"
  | "finance"
  | "data_entry";

export type Gender = "male" | "female" | "other";
export type RecordStatus = "active" | "inactive" | "archived";
export type ProjectStatus = "draft" | "active" | "on_hold" | "completed" | "cancelled";
export type ActivityType =
  | "training"
  | "awareness"
  | "meeting"
  | "field_visit"
  | "distribution"
  | "other";
export type ActivityStatus = "planned" | "completed" | "cancelled";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export type AttendanceStatus =
  | "present"
  | "absent"
  | "on_leave"
  | "field_duty"
  | "half_day"
  | "holiday";

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  employeeId: string | null;
  isActive: boolean;
  passwordHash: string;
}

export interface UserScope {
  userId: string;
  programmeId: string | null;
  projectId: string | null;
  villageId: string | null;
}

export interface Village {
  id: string;
  code: string;
  name: string;
  panchayat: string;
  block: string;
  district: string;
  state: string;
  population: number | null;
  status: RecordStatus;
}

export interface Donor {
  id: string;
  code: string;
  name: string;
  donorType: string;
  contactPerson: string;
  email: string;
  phone: string;
  grantStart: string;
  grantEnd: string;
  approvedBudget: number;
  status: RecordStatus;
}

export interface Programme {
  id: string;
  code: string;
  name: string;
  description: string;
  focusArea: string;
  startDate: string;
  endDate: string | null;
  coordinatorId: string | null;
  status: RecordStatus;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  donorId: string;
  programmeId: string;
  startDate: string;
  endDate: string;
  approvedBudget: number;
  coordinatorId: string | null;
  targetBeneficiaries: number;
  status: ProjectStatus;
  villageIds: string[];
}

export interface Employee {
  id: string;
  code: string;
  fullName: string;
  gender: Gender;
  dateOfBirth: string;
  mobile: string;
  email: string;
  designation: string;
  department: string;
  dateOfJoining: string;
  employmentType: "permanent" | "contract" | "consultant" | "intern";
  employmentStatus: "active" | "on_notice" | "exited";
  userId: string | null;
}

export interface Beneficiary {
  id: string;
  code: string;
  fullName: string;
  gender: Gender;
  dateOfBirth: string | null;
  mobile: string;
  villageId: string;
  enrolmentDate: string;
  status: RecordStatus;
  idProofType: "aadhaar" | "voter" | "ration" | "pan" | "other" | null;
  idProofLast4: string | null;
  photoPath?: string | null;
  projectIds: string[];
  consentGivenOn: string | null;
}

export interface Farmer {
  id: string;
  code: string;
  beneficiaryId: string;
  landHoldingAcres: number;
  landOwnership: "owned" | "leased" | "shared" | "landless";
  farmingType: "conventional" | "organic" | "mixed";
  organicStatus: "none" | "in_conversion" | "certified";
  irrigationSource: string;
  organicPractices?: string;
  supportReceived?: string;
  equipmentReceived?: string;
  farmerGroup?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  followupNotes?: string;
  status: RecordStatus;
  crops: { season: "kharif" | "rabi" | "zaid" | "perennial"; crop: string; areaAcres: number }[];
}

export interface PwdProfile {
  id: string;
  code: string;
  beneficiaryId: string;
  disabilityType: string;
  disabilityPercentage: number;
  certificateNo: string;
  certificateIssueDate?: string | null;
  certificateIssuingAuthority?: string;
  educationLevel: string;
  vocationalStatus: string;
  accessibilityNeeds?: string;
  assistiveDevice?: string;
  individualPlan?: string;
  outcome?: string;
  status: RecordStatus;
}

export interface PwdIntervention {
  id: string;
  pwdId: string;
  interventionType: string;
  givenOn: string;
  description: string;
}

export interface PwdFollowup {
  id: string;
  pwdId: string;
  followupDate: string;
  notes: string;
  recordedBy: string;
}

export interface Shg {
  id: string;
  code: string;
  name: string;
  villageId: string;
  formationDate: string;
  meetingFrequency: "weekly" | "fortnightly" | "monthly";
  status: RecordStatus;
  /** Junction to projects (PRD §4.7 shg_projects). */
  projectIds: string[];
}

/** Grant disbursement tranche from a donor against a project (WF-01). */
export interface DonorDisbursement {
  id: string;
  donorId: string;
  projectId: string;
  amount: number;
  disbursedOn: string; // ISO date
  notes: string;
  recordedBy: string; // profile id
  recordedAt: string; // ISO timestamp
}

export interface ShgMember {
  id: string;
  shgId: string;
  beneficiaryId: string;
  role: "member" | "president" | "secretary" | "treasurer";
  joinDate: string;
  status: RecordStatus;
}

export interface SavingsTransaction {
  id: string;
  shgMemberId: string;
  txnDate: string;
  txnType: "deposit" | "withdrawal";
  amount: number;
}

export interface Activity {
  id: string;
  code: string;
  programmeId: string;
  projectId: string;
  title: string;
  description: string;
  activityType: ActivityType;
  startDate: string;
  endDate: string;
  villageId: string;
  targetParticipants: number;
  status: ActivityStatus;
  expenditure: number | null;
}

export interface ActivityParticipant {
  activityId: string;
  beneficiaryId: string;
  attended: boolean;
}

export interface Indicator {
  id: string;
  code: string;
  projectId: string;
  name: string;
  unit: string;
  baseline: number;
  target: number;
  reportingFrequency: "monthly" | "quarterly" | "half_yearly" | "annual";
  genderDisaggregated: boolean;
}

export interface IndicatorValue {
  id: string;
  indicatorId: string;
  periodStart: string;
  periodEnd: string;
  value: number;
  maleValue: number | null;
  femaleValue: number | null;
}

export interface ProjectAllocation {
  employeeId: string;
  projectId: string;
  allocationPct: number;
  fromDate: string;
}

export interface LeaveType {
  id: string;
  name: string;
  annualQuota: number;
  isPaid: boolean;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedAt: string;
}

export interface Attendance {
  employeeId: string;
  attendanceDate: string;
  status: AttendanceStatus;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: "create" | "update" | "delete" | "view_sensitive" | "export" | "login";
  tableName: string;
  recordId: string;
  at: string;
}

export interface Db {
  profiles: Profile[];
  userScopes: UserScope[];
  villages: Village[];
  donors: Donor[];
  donorDisbursements: DonorDisbursement[];
  programmes: Programme[];
  projects: Project[];
  employees: Employee[];
  projectAllocations: ProjectAllocation[];
  beneficiaries: Beneficiary[];
  farmers: Farmer[];
  pwdProfiles: PwdProfile[];
  pwdInterventions?: PwdIntervention[];
  pwdFollowups?: PwdFollowup[];
  shgs: Shg[];
  shgMembers: ShgMember[];
  savings: SavingsTransaction[];
  activities: Activity[];
  participants: ActivityParticipant[];
  indicators: Indicator[];
  indicatorValues: IndicatorValue[];
  leaveTypes: LeaveType[];
  leaveRequests: LeaveRequest[];
  attendance: Attendance[];
  audit: AuditEntry[];
}
