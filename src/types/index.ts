export type TaskCategory = 
  | 'College'
  | 'Practical'
  | 'Assignment'
  | 'Exam'
  | 'Project'
  | 'Hackathon'
  | 'Presentation'
  | 'Personal'
  | 'Other';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface Task {
  id: string;
  name: string;
  description: string;
  category: TaskCategory;
  deadline: string; // ISO date-time string
  priority: TaskPriority;
  status: TaskStatus;
  notes?: string;
  tags?: string[];
  createdAt: string;
}

export type DeadlineCategory = 
  | 'Assignment'
  | 'Practical'
  | 'PPT'
  | 'Project'
  | 'Hackathon'
  | 'Quiz'
  | 'Exam'
  | 'Event';

export type DeadlineStatus = 'Upcoming' | 'Due Soon' | 'Overdue' | 'Completed';

export interface Deadline {
  id: string;
  title: string;
  description: string;
  category: DeadlineCategory;
  dueDate: string; // ISO date-time string
  status: DeadlineStatus;
  taskId?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  category: string;
  startDate: string; // ISO date string YYYY-MM-DD
  startTime?: string; // HH:mm
  endDate?: string;
  allDay?: boolean;
  type: 'task' | 'deadline' | 'hackathon' | 'event';
  referenceId?: string;
}

export type MilestoneStage = 
  | 'Registration'
  | 'Idea Submission'
  | 'PPT Submission'
  | 'Screening Quiz'
  | 'Prototype'
  | 'Final Submission'
  | 'Final Pitch';

export type MilestoneStatus = 'Pending' | 'Current' | 'Completed' | 'Missed';

export interface HackathonMilestone {
  id: string;
  hackathonId: string;
  stage: MilestoneStage;
  title: string;
  date: string;
  time?: string;
  status: MilestoneStatus;
  notes?: string;
  associatedTaskId?: string;
}

export interface Hackathon {
  id: string;
  name: string;
  organizer: string;
  registrationDeadline: string;
  currentStage: string;
  status: 'Upcoming' | 'In Progress' | 'Submitted' | 'Won' | 'Completed';
  notes?: string;
  trackName?: string;
  deliverable?: string;
  bannerImage?: string;
  milestones: HackathonMilestone[];
}

export type ExpenseCategory = 
  | 'Food'
  | 'Travel'
  | 'College'
  | 'Study Material'
  | 'Software'
  | 'Hackathon'
  | 'Shopping'
  | 'Entertainment'
  | 'Recharge'
  | 'Hostel / Room'
  | 'Other';

export type PaymentSource = 'Cash' | 'UPI' | 'Card';

export type IncomeDestination = 'UPI' | 'Cash';

export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: ExpenseCategory | 'Pocket Money' | 'Scholarship' | 'Stipend' | 'Transfer' | 'Other';
  date: string; // ISO date or YYYY-MM-DD
  time?: string;
  paymentSource?: PaymentSource; // For expenses
  destination?: IncomeDestination; // For income
  transferFrom?: 'UPI' | 'Cash'; // For transfer
  transferTo?: 'UPI' | 'Cash'; // For transfer
  notes?: string;
  status: 'Settled' | 'Pending' | 'Free Tier';
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  college: string;
  course: string;
  year?: string;
  semester?: string;
  currentSemester: string;
  bio: string;
  avatarUrl: string;
}

export interface Balances {
  upiBalance: number;
  cashBalance: number;
}

export type AppTheme = 'light' | 'dark' | 'system';

export type AppNavTab = 
  | 'dashboard' 
  | 'tasks' 
  | 'calendar' 
  | 'hackathons' 
  | 'money' 
  | 'analytics' 
  | 'profile' 
  | 'settings';
