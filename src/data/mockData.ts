import { Team, TeamMember, Task } from "@/types";

export const mockMembers: TeamMember[] = [
  { id: "1", name: "Иван Петров", email: "ivan@company.bg", role: "Мениджър маркетинг" },
  { id: "2", name: "Мария Иванова", email: "maria@company.bg", role: "Дизайнер", managerId: "1" },
  { id: "3", name: "Георги Димитров", email: "georgi@company.bg", role: "Копирайтър", managerId: "1" },
  { id: "4", name: "Елена Стоянова", email: "elena@company.bg", role: "Мениджър продажби" },
  { id: "5", name: "Петър Николов", email: "petar@company.bg", role: "Търговец", managerId: "4" },
  { id: "6", name: "Анна Василева", email: "anna@company.bg", role: "Търговец", managerId: "4" },
];

export const mockTeams: Team[] = [
  {
    id: "1",
    name: "Маркетинг екип",
    description: "Отговорен за всички маркетинг дейности и кампании",
    managerId: "1",
    members: mockMembers.filter(m => m.id === "1" || m.managerId === "1"),
    color: "hsl(221, 83%, 53%)"
  },
  {
    id: "2",
    name: "Продажби екип",
    description: "Управление на продажбите и клиентските връзки",
    managerId: "4",
    members: mockMembers.filter(m => m.id === "4" || m.managerId === "4"),
    color: "hsl(174, 72%, 46%)"
  },
];

export const mockTasks: Task[] = [
  {
    id: "1",
    title: "Създаване на социална кампания",
    description: "Подготовка на рекламни материали за Facebook и Instagram",
    status: "in-progress",
    priority: "high",
    assigneeId: "2",
    teamId: "1",
    dueDate: "2024-02-15",
    createdAt: "2024-01-20"
  },
  {
    id: "2",
    title: "Писане на блог статия",
    description: "SEO оптимизирана статия за новите продукти",
    status: "todo",
    priority: "medium",
    assigneeId: "3",
    teamId: "1",
    dueDate: "2024-02-10",
    createdAt: "2024-01-22"
  },
  {
    id: "3",
    title: "Обаждане на ключови клиенти",
    description: "Follow-up с 10 потенциални клиента",
    status: "done",
    priority: "high",
    assigneeId: "5",
    teamId: "2",
    createdAt: "2024-01-18"
  },
  {
    id: "4",
    title: "Подготовка на оферта",
    description: "Изготвяне на персонализирана оферта за ABC Company",
    status: "in-progress",
    priority: "high",
    assigneeId: "6",
    teamId: "2",
    dueDate: "2024-02-05",
    createdAt: "2024-01-25"
  },
];
