import { Users, UserCircle } from "lucide-react";
import { Team, TeamMember } from "@/types";
import { cn } from "@/lib/utils";

interface TeamCardProps {
  team: Team;
  onSelect: (team: Team) => void;
}

function MemberAvatar({ member, isManager }: { member: TeamMember; isManager?: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg p-3 transition-colors",
      isManager ? "bg-primary/10" : "bg-secondary hover:bg-secondary/80"
    )}>
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full",
        isManager ? "gradient-primary" : "bg-muted"
      )}>
        <UserCircle className={cn(
          "h-6 w-6",
          isManager ? "text-primary-foreground" : "text-muted-foreground"
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{member.name}</p>
        <p className="text-sm text-muted-foreground truncate">{member.role}</p>
      </div>
      {isManager && (
        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
          Мениджър
        </span>
      )}
    </div>
  );
}

export function TeamCard({ team, onSelect }: TeamCardProps) {
  const manager = team.members.find(m => m.id === team.managerId);
  const members = team.members.filter(m => m.id !== team.managerId);

  return (
    <div 
      className="glass-card rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
      onClick={() => onSelect(team)}
    >
      {/* Header */}
      <div 
        className="p-6"
        style={{ background: `linear-gradient(135deg, ${team.color} 0%, ${team.color}99 100%)` }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-display font-bold text-primary-foreground">{team.name}</h3>
            <p className="text-sm text-primary-foreground/80 mt-1">{team.description}</p>
          </div>
          <div className="flex items-center gap-2 bg-primary-foreground/20 rounded-full px-3 py-1">
            <Users className="h-4 w-4 text-primary-foreground" />
            <span className="text-sm font-medium text-primary-foreground">{team.members.length}</span>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="p-4 space-y-2">
        {manager && <MemberAvatar member={manager} isManager />}
        {members.map(member => (
          <MemberAvatar key={member.id} member={member} />
        ))}
      </div>
    </div>
  );
}
