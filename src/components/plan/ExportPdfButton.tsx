import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pdf } from "@react-pdf/renderer";
import { PlanPdfDocument } from "./PlanPdfDocument";
import { toast } from "sonner";
import type { PlanStep } from "@/hooks/usePlanSteps";
import type { GlobalBot } from "@/hooks/useGlobalBots";

interface ExportPdfButtonProps {
  steps: PlanStep[];
  bots: GlobalBot[];
  projectName?: string;
}

export function ExportPdfButton({ steps, bots, projectName }: ExportPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (steps.length === 0) {
      toast.error("Няма стъпки за експортиране");
      return;
    }

    setIsExporting(true);

    try {
      const doc = <PlanPdfDocument steps={steps} bots={bots} projectName={projectName} />;
      const blob = await pdf(doc).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `бизнес-план-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PDF е експортиран успешно");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Грешка при експортиране на PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
      className="gap-1.5 rounded-xl text-xs md:text-sm px-2.5 md:px-4 h-8 md:h-9"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
          <span className="hidden sm:inline">Експортиране...</span>
        </>
      ) : (
        <>
          <FileDown className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span className="hidden sm:inline">Експорт</span> PDF
        </>
      )}
    </Button>
  );
}
