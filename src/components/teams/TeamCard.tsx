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
      "flex items-center gap-2 md:gap-3 rounded-lg p-2 md:p-3 transition-colors",
      isManager ? "bg-primary/10" : "bg-secondary hover:bg-secondary/80"
    )}>
      <div className={cn(
        "flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full shrink-0",
        isManager ? "gradient-primary" : "bg-muted"
      )}>
        <UserCircle className={cn(
          "h-5 w-5 md:h-6 md:w-6",
          isManager ? "text-primary-foreground" : "text-muted-foreground"
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm md:text-base text-foreground truncate">{member.name}</p>
        <p className="text-xs md:text-sm text-muted-foreground truncate">{member.role}</p>
      </div>
      {isManager && (
        <span className="text-[10px] md:text-xs font-medium text-primary bg-primary/10 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full shrink-0">
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
      className="glass-card rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl active:scale-[0.98]"
      onClick={() => onSelect(team)}
    >
      {/* Header */}
      <div 
        className="p-4 md:p-6"
        style={{ background: `linear-gradient(135deg, ${team.color} 0%, ${team.color}99 100%)` }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg md:text-xl font-display font-bold text-white truncate">{team.name}</h3>
            {team.description && (
              <p className="text-xs md:text-sm text-white/80 mt-0.5 md:mt-1 truncate">{team.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-2 md:px-3 py-0.5 md:py-1 shrink-0">
            <Users className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
            <span className="text-xs md:text-sm font-medium text-white">{team.members.length}</span>
          </div>
        </div>
      </div>

      {/* Members - Show fewer on mobile */}
      <div className="p-3 md:p-4 space-y-1.5 md:space-y-2">
        {manager && <MemberAvatar member={manager} isManager />}
        {members.slice(0, 2).map(member => (
          <MemberAvatar key={member.id} member={member} />
        ))}
        {members.length > 2 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            +{members.length - 2} още
          </p>
        )}
      </div>
    </div>
  );
}
