// Question templates for each plan step with validation requirements
export interface StepQuestion {
  key: string;
  question: string;
  followUp?: string;
  type: 'text' | 'choice' | 'list';
  options?: string[];
  required: boolean;
}

export interface StepQuestions {
  stepTitle: string;
  botRole: string;
  greeting: string;
  questions: StepQuestion[];
  requiredFields: string[];
  exitCriteria: string;
  completionMessage: string;
  summaryPrompt: string;
  contextKeys: string[]; // Keys to store in bot_context for other bots
}

export const stepQuestionsMap: Record<string, StepQuestions> = {
  "Резюме на бизнеса": {
    stepTitle: "Резюме на бизнеса",
    botRole: "Бизнес Анализатор",
    greeting: `Здравейте! Аз съм вашият Бизнес Анализатор.

Моята задача е да разбера какво представлява вашият бизнес, какви са ресурсите ви и как искате да работите.

За да започнем, моля отговорете на следните въпроси:

**1. Какъв е вашият бизнес?** (продукт / услуга / SaaS / обучение)
**2. За кого е предназначен?** (основна аудитория)
**3. С колко човека екип започвате?** (сам, 2-3 души, 5+ души)`,
    questions: [
      {
        key: "business_type",
        question: "Какъв е вашият бизнес? (продукт, услуга, SaaS, обучение, консултации...)",
        type: "text",
        required: true
      },
      {
        key: "target_audience",
        question: "За кого е предназначен? Коя е вашата основна аудитория?",
        type: "text",
        required: true
      },
      {
        key: "problem_solved",
        question: "Какъв проблем решава за тях?",
        type: "text",
        required: true
      },
      {
        key: "team_size",
        question: "С колко човека екип започвате? (сам, 2-3 души, 5+ души)",
        type: "text",
        required: true
      },
      {
        key: "hours_per_day",
        question: "Колко часа на ден искате да отделяте за проекта? (2-3 часа, 4-6 часа, цял ден)",
        type: "text",
        required: true
      },
      {
        key: "preferred_work_hours",
        question: "В кои часове ви е най-удобно да работите? (сутрин 8-12, обяд 12-16, следобед 16-20, вечер след 20)",
        type: "text",
        required: true
      },
      {
        key: "revenue_model",
        question: "Как печели пари бизнесът? (еднократни продажби, абонамент, комисионна, реклама...)",
        type: "text",
        required: true
      },
      {
        key: "main_goal",
        question: "Каква е основната ви цел? (растеж, продажби, мащабиране, навлизане на нов пазар...)",
        type: "text",
        required: true
      }
    ],
    requiredFields: ["business_type", "target_audience", "problem_solved", "team_size", "hours_per_day", "preferred_work_hours", "revenue_model", "main_goal"],
    exitCriteria: "Всички задължителни полета са попълнени с ясни отговори",
    completionMessage: "Имам ясна картина за твоя бизнес, екип и време. Можем да преминем към следващото ниво – Пазарен анализ.",
    summaryPrompt: "Създай кратко резюме (5-6 реда) на бизнеса базирано на: тип бизнес, целева аудитория, решаван проблем, размер на екипа, налично време и основна цел.",
    contextKeys: ["business_type", "target_audience", "problem_solved", "team_size", "hours_per_day", "preferred_work_hours", "revenue_model", "main_goal"]
  },
  
  "Пазарен анализ": {
    stepTitle: "Пазарен анализ",
    botRole: "Пазарен Анализатор",
    greeting: `Отлично! Аз съм вашият Пазарен Анализатор.

Вече знам за вашия бизнес и екип от колегата ми. Сега трябва да определим къде е възможността на пазара.

Нека започнем:

**1. Кои са вашите основни конкуренти?** (минимум 3)
**2. Как клиентите купуват в момента?**
**3. Какви са алтернативите за клиентите?**`,
    questions: [
      {
        key: "competitors",
        question: "Кои са вашите основни конкуренти? Назовете минимум 3.",
        type: "text",
        required: true
      },
      {
        key: "buying_behavior",
        question: "Как клиентите купуват подобни решения в момента?",
        type: "text",
        required: true
      },
      {
        key: "alternatives",
        question: "Какви са алтернативите за клиентите? (включително 'нищо не правя')",
        type: "text",
        required: true
      },
      {
        key: "market_prices",
        question: "Какви са приблизителните цени на пазара за подобни продукти/услуги?",
        type: "text",
        required: true
      },
      {
        key: "entry_barriers",
        question: "Какви са основните бариери за влизане на този пазар?",
        type: "text",
        required: true
      }
    ],
    requiredFields: ["competitors", "buying_behavior", "alternatives", "market_prices", "entry_barriers"],
    exitCriteria: "Ясно е кой печели, кой губи и къде има празно място на пазара",
    completionMessage: "Пазарът е анализиран и има ясна възможност за позициониране. Готови сме да преминем към маркетинг стратегия.",
    summaryPrompt: "Анализирай пазара: кой печели, кой губи, къде има празно място. Базирай се на конкурентите, поведението на купувачите и бариерите.",
    contextKeys: ["competitors", "market_opportunity", "competitive_advantage"]
  },

  "Маркетинг стратегия": {
    stepTitle: "Маркетинг стратегия",
    botRole: "Маркетинг Стратег и Кампейн Плановик",
    greeting: `Страхотно! Аз съм вашият Маркетинг Стратег.

Имам информация за бизнеса, екипа и пазара от колегите. Сега трябва да определим маркетинговите канали и да създадем **конкретни седмични кампании**.

**Знам коя дата е днес** и ще създаваме планове за следващите 4 седмици!

Нека започнем:

**1. Кои маркетинг канали планирате да използвате?** (Instagram, TikTok, Facebook, Email, SEO...)
**2. Какъв бюджет имате за реклами на седмица?**
**3. Каква промоция/оферта искате да пуснете първата седмица?**`,
    questions: [
      {
        key: "positioning",
        question: "Какво е вашето основно позициониране? Защо клиентът да избере вас, а не конкурент?",
        type: "text",
        required: true
      },
      {
        key: "marketing_channels",
        question: "Кои маркетинг канали ще използвате? (Instagram, TikTok, Facebook Ads, Email, SEO, YouTube, LinkedIn...)",
        type: "text",
        required: true
      },
      {
        key: "sales_channels",
        question: "Какви са каналите за продажби до крайния клиент? (онлайн магазин, директни продажби, партньори, дистрибутори, marketplace...)",
        type: "text",
        required: true
      },
      {
        key: "main_message",
        question: "Какво е основното ви послание към клиентите?",
        type: "text",
        required: true
      },
      {
        key: "lead_mechanism",
        question: "Как ще хващате вниманието? Какъв е вашият lead магнит или hook?",
        type: "text",
        required: true
      },
      {
        key: "cta",
        question: "Каква е следващата стъпка за клиента? (CTA - Call to Action)",
        type: "text",
        required: true
      },
      {
        key: "weekly_ad_budget",
        question: "Какъв седмичен бюджет имате за платени реклами? (в лева)",
        type: "text",
        required: true
      },
      {
        key: "week1_promo",
        question: "Какво искате да таргетирате/промотирате ТАЗИ седмица? (напр: 30% отстъпка, нов продукт, ранни записвания...)",
        type: "text",
        required: true
      },
      {
        key: "week2_target",
        question: "Кого искате да таргетирате СЛЕДВАЩАТА седмица? (напр: модели, студенти, микроинфлуенсъри, бизнеси...)",
        type: "text",
        required: true
      }
    ],
    requiredFields: ["positioning", "marketing_channels", "sales_channels", "main_message", "lead_mechanism", "cta", "weekly_ad_budget", "week1_promo", "week2_target"],
    exitCriteria: "Има ясно позициониране, маркетинг канали и записани седмични кампании",
    completionMessage: "Маркетинг стратегията е ясна и седмичните кампании са записани. Можем да преминем към оперативен план.",
    summaryPrompt: "Създай маркетинг стратегия с ясно позициониране, избрани маркетинг и продажбени канали, основно послание, lead механизъм и CTA.",
    contextKeys: ["positioning", "marketing_channels", "sales_channels", "main_message", "cta", "weekly_ad_budget", "week1_promo", "week2_target"]
  },

  "Оперативен план": {
    stepTitle: "Оперативен план",
    botRole: "Оперативен Мениджър",
    greeting: `Перфектно! Аз съм вашият Оперативен Мениджър.

Имам стратегията от маркетинг колегата и знам колко време имате. Сега трябва да създадем реалистичен план за изпълнение.

Нека започнем:

**1. Какви са целите ви за първия месец?**
**2. Какви са целите ви за първите 3 месеца?**
**3. Какви ресурси имате налични?**`,
    questions: [
      {
        key: "monthly_goals_1",
        question: "Какви са целите ви за първия месец? (конкретни и измерими)",
        type: "text",
        required: true
      },
      {
        key: "monthly_goals_3",
        question: "Какви са целите ви за първите 3 месеца? (конкретни и измерими)",
        type: "text",
        required: true
      },
      {
        key: "weekly_activities",
        question: "Какви основни дейности ще се правят всяка седмица? (създаване на съдържание, обаждания, реклами...)",
        type: "text",
        required: true
      },
      {
        key: "who_does_it",
        question: "Кой изпълнява задачите? (вие, екип, AI, автоматизация, аутсорсинг)",
        type: "text",
        required: true
      },
      {
        key: "resources_needed",
        question: "Какви ресурси са нужни? (инструменти, софтуер, бюджет)",
        type: "text",
        required: true
      },
      {
        key: "priorities",
        question: "Какви са приоритетите? Кое се прави първо?",
        type: "text",
        required: true
      }
    ],
    requiredFields: ["monthly_goals_1", "monthly_goals_3", "weekly_activities", "who_does_it", "resources_needed", "priorities"],
    exitCriteria: "Има ясен action plan с цели по месеци и седмични дейности",
    completionMessage: "Имаме конкретен план за изпълнение. Следва финансовата прогноза.",
    summaryPrompt: "Създай оперативен план с месечни цели, седмични дейности, отговорници, ресурси и приоритети.",
    contextKeys: ["monthly_goals_1", "monthly_goals_3", "weekly_activities", "team_structure", "priorities"]
  },

  "Финансови прогнози": {
    stepTitle: "Финансови прогнози",
    botRole: "Финансов Анализатор",
    greeting: `Чудесно! Аз съм вашият Финансов Анализатор.

Имам пълната картина от колегите – бизнес модел, пазар, стратегия и операции. Сега трябва да видим дали има смисъл икономически.

Нека започнем:

**1. Какви са основните ви разходи?**
**2. Какви са очакваните приходи?**
**3. Какъв бюджет имате за маркетинг?**`,
    questions: [
      {
        key: "main_costs",
        question: "Какви са основните ви разходи? (фиксирани и променливи)",
        type: "text",
        required: true
      },
      {
        key: "main_revenue",
        question: "Какви са очакваните основни приходи за първите 3 месеца?",
        type: "text",
        required: true
      },
      {
        key: "marketing_budget",
        question: "Какъв месечен бюджет имате за маркетинг и реклама?",
        type: "text",
        required: true
      },
      {
        key: "cac",
        question: "Какъв е ориентировъчният разход за придобиване на клиент (CAC)?",
        type: "text",
        required: true
      },
      {
        key: "break_even",
        question: "Каква е вашата break-even логика? Кога очаквате да излезете на печалба?",
        type: "text",
        required: true
      },
      {
        key: "scenarios",
        question: "Опишете 3 сценария: оптимистичен, реалистичен и песимистичен.",
        type: "text",
        required: true
      }
    ],
    requiredFields: ["main_costs", "main_revenue", "marketing_budget", "cac", "break_even", "scenarios"],
    exitCriteria: "Има числова логика и е ясно дали бизнесът е устойчив",
    completionMessage: "Финансовият модел е готов. Бизнес планът е завършен! Сега ще генерирам вашия седмичен план по дни и часове.",
    summaryPrompt: "Създай финансова прогноза с разходи, приходи, маркетинг бюджет, CAC, break-even анализ и три сценария.",
    contextKeys: ["revenue_projection", "cost_structure", "marketing_budget", "break_even_timeline"]
  }
};

export function getQuestionsForStep(stepTitle: string): StepQuestions | null {
  return stepQuestionsMap[stepTitle] || null;
}

// Get step order by title
export function getStepOrder(stepTitle: string): number {
  const order: Record<string, number> = {
    "Резюме на бизнеса": 1,
    "Пазарен анализ": 2,
    "Маркетинг стратегия": 3,
    "Оперативен план": 4,
    "Финансови прогнози": 5
  };
  return order[stepTitle] || 0;
}

// Check if all required fields are collected
export function areRequiredFieldsComplete(stepTitle: string, answers: Record<string, string>): boolean {
  const stepQuestions = getQuestionsForStep(stepTitle);
  if (!stepQuestions) return false;
  
  return stepQuestions.requiredFields.every(field => {
    const answer = answers[field];
    return answer && 
           answer.trim().length > 0 && 
           !answer.toLowerCase().includes('не знам') &&
           !answer.toLowerCase().includes('не съм решил') &&
           !answer.toLowerCase().includes('не съм сигурен');
  });
}

// Get all collected context from all steps
export function getAllContextKeys(): string[] {
  const allKeys: string[] = [];
  Object.values(stepQuestionsMap).forEach(step => {
    allKeys.push(...step.contextKeys);
  });
  return [...new Set(allKeys)];
}
