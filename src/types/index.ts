export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  managerId?: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  managerId: string;
  members: TeamMember[];
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  assigneeId: string;
  teamId: string;
  dueDate?: string;
  createdAt: string;
}
