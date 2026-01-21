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
      onClick={handleExport}
      disabled={isExporting}
      className="gap-2"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Експортиране...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" />
          Експорт PDF
        </>
      )}
    </Button>
  );
}
