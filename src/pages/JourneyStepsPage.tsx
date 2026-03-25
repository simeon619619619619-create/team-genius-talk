import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Target, Calendar, Link2, Users, BarChart3,
  ChevronRight, Lock, CheckCircle2, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

const steps = [
  {
    id: 1,
    icon: BookOpen,
    title: "Методология",
    subtitle: "Основата на бизнеса ти",
    description: "6 модула с AI, които ще ти помогнат да изградиш ясна визия, стратегия и маркетинг подход. Всеки модул завършва с конкретен резултат.",
    details: [
      "Визия и мисия на бизнеса",
      "Пазарно проучване и анализ",
      "Ценообразуване и оферта",
      "Продажбен текст и комуникация",
      "Дигитална стратегия",
      "Маркетинг фуния",
    ],
    route: "/modules",
    color: "from-amber-500 to-orange-600",
  },
  {
    id: 2,
    icon: Target,
    title: "Маркетинг План",
    subtitle: "AI създава план от наученото",
    description: "На база модулите, AI автоматично генерира маркетинг план с кампании, задачи и график. Ти само преглеждаш и коригираш.",
    details: [
      "Автоматично генериран от AI",
      "Месечни кампании",
      "Разпределение по канали",
      "Задачи и срокове",
    ],
    route: "/plan",
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: 3,
    icon: Calendar,
    title: "Бизнес План",
    subtitle: "Седмичен график за изпълнение",
    description: "Превръща маркетинг плана в конкретен седмичен график — кой ден, какво се прави, какъв е очакваният резултат.",
    details: [
      "Седмичен график по дни",
      "Цели по категории",
      "Проследяване на напредъка",
      "Автоматично генериране",
    ],
    route: "/business-plan",
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: 4,
    icon: Link2,
    title: "Свързване на API",
    subtitle: "Свържи инструментите си",
    description: "Свържи Resend (имейли), GoHighLevel (CRM) и други инструменти, за да могат AI ботовете да работят автоматично от твое име.",
    details: [
      "Resend — имейл маркетинг",
      "GoHighLevel — CRM и автоматизации",
      "Уебсайт интеграция",
      "Бъдещи интеграции",
    ],
    route: "/settings",
    color: "from-purple-500 to-violet-600",
  },
  {
    id: 5,
    icon: Users,
    title: "Екипи + AI Ботове",
    subtitle: "Разпредели задачите",
    description: "6 AI бота поемат различни роли — маркетинг, продажби, имейли, SEO, стратегия и управление. Разпределяш задачите и те почват да действат.",
    details: [
      "Ивана — Съдържание и реклами",
      "Лина — Продажби и клиенти",
      "Мария — Email маркетинг",
      "Дара — Стратегия и анализи",
      "Елена — Уеб и SEO",
      "Софи — Проджект мениджър",
    ],
    route: "/teams",
    color: "from-pink-500 to-rose-600",
  },
  {
    id: 6,
    icon: BarChart3,
    title: "Бизнес Процеси + Задачи",
    subtitle: "Следи изпълнението",
    description: "Виж всички задачи, процеси и напредък на едно място. Ботовете докладват, ти вземаш решения.",
    details: [
      "Табло с всички задачи",
      "Статус на изпълнение",
      "Бизнес процеси (mind map)",
      "Автоматични отчети",
    ],
    route: "/tasks",
    color: "from-cyan-500 to-blue-600",
  },
];

export default function JourneyStepsPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const { updateProfile, profile } = useProfile();
  const navigate = useNavigate();

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const Icon = step.icon;

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleComplete = async () => {
    const bp = profile?.business_profile || {};
    await updateProfile({
      business_profile: { ...bp, journey_steps_seen: "true" },
    } as any);
    navigate("/modules", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center pt-8 pb-4">
        <img src={logo} alt="Simora" className="h-8 opacity-80" />
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 py-4">
        {steps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setCurrentStep(i)}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-all duration-300",
              i === currentStep
                ? "bg-white w-8"
                : i < currentStep
                ? "bg-white/60"
                : "bg-white/20"
            )}
          />
        ))}
      </div>

      {/* Step counter */}
      <p className="text-center text-white/40 text-xs tracking-widest uppercase mb-6">
        Стъпка {currentStep + 1} от {steps.length}
      </p>

      {/* Main content */}
      <div className="flex-1 flex items-start justify-center px-6 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-lg"
          >
            {/* Icon */}
            <div className={cn("w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mx-auto mb-6", step.color)}>
              <Icon className="w-8 h-8 text-white" />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-white text-center mb-2">
              {step.title}
            </h1>
            <p className="text-white/50 text-center text-sm mb-6">
              {step.subtitle}
            </p>

            {/* Description */}
            <p className="text-white/70 text-center leading-relaxed mb-8">
              {step.description}
            </p>

            {/* Details */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-8">
              <div className="grid grid-cols-1 gap-2.5">
                {step.details.map((detail, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={cn("w-1.5 h-1.5 rounded-full bg-gradient-to-r shrink-0", step.color)} />
                    <span className="text-white/60 text-sm">{detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Lock indicator for steps 2+ */}
            {currentStep > 0 && (
              <div className="flex items-center justify-center gap-2 mb-6 text-white/30 text-xs">
                <Lock className="w-3.5 h-3.5" />
                <span>Отключва се след завършване на предишната стъпка</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom buttons */}
      <div className="px-6 pb-10 max-w-lg mx-auto w-full">
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="border-white/20 text-white hover:bg-white/10 flex-shrink-0"
            >
              Назад
            </Button>
          )}
          <Button
            onClick={handleNext}
            className={cn(
              "flex-1 text-white font-medium py-6 text-base gap-2",
              isLast
                ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                : "bg-white/10 hover:bg-white/20 border border-white/20"
            )}
          >
            {isLast ? (
              <>
                Започни с Методологията
                <ArrowRight className="w-5 h-5" />
              </>
            ) : (
              <>
                Продължи
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </div>

        {/* Skip button */}
        <button
          onClick={handleComplete}
          className="w-full text-center text-white/30 text-xs mt-4 hover:text-white/50 transition-colors"
        >
          Пропусни и отиди в платформата
        </button>
      </div>
    </div>
  );
}
